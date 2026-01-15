/**
 * Logging infrastructure for agent execution
 */

import { createClient } from '@/lib/supabase/server';
import {
  AgentExecutionResult,
  AgentError,
  ValidationWarning
} from './types';

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  agentName?: string;
  message: string;
  data?: any;
}

export interface PerformanceMetrics {
  totalTime: number;
  tokensUsed: number;
  agentsExecuted: number;
  agentsFailed: number;
}

export class AgentLogger {
  private logs: LogEntry[] = [];
  private callId?: string;
  private organizationId?: string;
  private enableDatabase: boolean = process.env.LOG_AGENTS_TO_DB === 'true';
  private enableConsole: boolean = process.env.NODE_ENV !== 'test';

  constructor(callId?: string, organizationId?: string) {
    this.callId = callId;
    this.organizationId = organizationId;
  }

  /**
   * Log a message
   */
  log(message: string, data?: any): void {
    this.addEntry('info', message, data);
  }

  /**
   * Log a warning
   */
  warn(message: string, data?: any): void {
    this.addEntry('warn', message, data);
  }

  /**
   * Log an error
   */
  error(message: string, error?: any): void {
    this.addEntry('error', message, {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });
  }

  /**
   * Log debug information
   */
  debug(message: string, data?: any): void {
    if (process.env.DEBUG === 'true') {
      this.addEntry('debug', message, data);
    }
  }

  /**
   * Log agent execution start
   */
  logAgentStart(agentName: string, input?: any): void {
    this.addEntry('info', `Starting agent: ${agentName}`, {
      agentName,
      inputSize: JSON.stringify(input || {}).length
    });
  }

  /**
   * Log agent execution success
   */
  logAgentSuccess(agentName: string, result: AgentExecutionResult): void {
    this.addEntry('info', `Agent completed: ${agentName}`, {
      agentName,
      executionTime: result.executionTime,
      tokensUsed: result.tokensUsed,
      outputSize: JSON.stringify(result.output || {}).length,
      warnings: result.warnings
    });

    // Store to database if enabled
    if (this.enableDatabase && this.callId) {
      this.storeAgentExecution(agentName, result);
    }
  }

  /**
   * Log agent execution failure
   */
  logAgentFailure(agentName: string, error: AgentError): void {
    this.addEntry('error', `Agent failed: ${agentName}`, {
      agentName,
      errorCode: error.code,
      errorMessage: error.message,
      recoverable: error.recoverable,
      details: error.details
    });

    // Store to database if enabled
    if (this.enableDatabase && this.callId) {
      this.storeAgentError(agentName, error);
    }
  }

  /**
   * Log validation warnings
   */
  logValidationWarnings(warnings: ValidationWarning[]): void {
    const critical = warnings.filter(w => w.severity === 'critical');
    const other = warnings.filter(w => w.severity !== 'critical');

    if (critical.length > 0) {
      this.error('Critical validation warnings', critical);
    }

    if (other.length > 0) {
      this.warn('Validation warnings', other);
    }
  }

  /**
   * Log performance metrics
   */
  logPerformance(metrics: PerformanceMetrics): void {
    this.addEntry('info', 'Extraction performance', {
      ...metrics,
      avgTimePerAgent: metrics.agentsExecuted > 0
        ? Math.round(metrics.totalTime / metrics.agentsExecuted)
        : 0,
      avgTokensPerAgent: metrics.agentsExecuted > 0
        ? Math.round(metrics.tokensUsed / metrics.agentsExecuted)
        : 0,
      successRate: metrics.agentsExecuted > 0
        ? ((metrics.agentsExecuted - metrics.agentsFailed) / metrics.agentsExecuted * 100).toFixed(1)
        : 0
    });
  }

  /**
   * Add a log entry
   */
  private addEntry(
    level: LogEntry['level'],
    message: string,
    data?: any,
    agentName?: string
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      agentName,
      data
    };

    this.logs.push(entry);

    if (this.enableConsole) {
      this.logToConsole(entry);
    }
  }

  /**
   * Log to console
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}]${entry.agentName ? ` [${entry.agentName}]` : ''}`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        console.debug(message, entry.data || '');
        break;
      case 'info':
        console.log(message, entry.data || '');
        break;
      case 'warn':
        console.warn(message, entry.data || '');
        break;
      case 'error':
        console.error(message, entry.data || '');
        break;
    }
  }

  /**
   * Store agent execution to database
   */
  private async storeAgentExecution(agentName: string, result: AgentExecutionResult): Promise<void> {
    if (!this.callId) return;

    try {
      const supabase = createClient();

      await supabase.from('agent_execution_logs').insert({
        call_id: this.callId,
        agent_name: agentName,
        execution_time_ms: result.executionTime,
        success: result.status === 'completed',
        tokens_used: result.tokensUsed,
        warnings: result.warnings,
        metadata: result.metadata
      });

      // Store agent output
      if (result.output) {
        await supabase.from('agent_outputs').insert({
          call_id: this.callId,
          agent_name: agentName,
          output: result.output,
          confidence: result.output.confidence?.value,
          version: '1.0.0' // You might want to track agent versions
        });
      }
    } catch (error) {
      // Don't let logging errors break the flow
      console.error('Failed to store agent execution log:', error);
    }
  }

  /**
   * Store agent error to database
   */
  private async storeAgentError(agentName: string, error: AgentError): Promise<void> {
    if (!this.callId) return;

    try {
      const supabase = createClient();

      await supabase.from('agent_execution_logs').insert({
        call_id: this.callId,
        agent_name: agentName,
        success: false,
        error_message: error.message,
        error_code: error.code,
        error_details: error.details
      });
    } catch (dbError) {
      console.error('Failed to store agent error log:', dbError);
    }
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return this.logs;
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs by agent
   */
  getLogsByAgent(agentName: string): LogEntry[] {
    return this.logs.filter(log => log.agentName === agentName);
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify({
      callId: this.callId,
      organizationId: this.organizationId,
      logs: this.logs,
      summary: {
        total: this.logs.length,
        errors: this.logs.filter(l => l.level === 'error').length,
        warnings: this.logs.filter(l => l.level === 'warn').length,
        info: this.logs.filter(l => l.level === 'info').length,
        debug: this.logs.filter(l => l.level === 'debug').length
      }
    }, null, 2);
  }

  /**
   * Clear logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Create a child logger for a specific agent
   */
  createAgentLogger(agentName: string): AgentSpecificLogger {
    return new AgentSpecificLogger(this, agentName);
  }
}

/**
 * Agent-specific logger that automatically includes agent name
 */
export class AgentSpecificLogger {
  constructor(
    private parent: AgentLogger,
    private agentName: string
  ) {}

  log(message: string, data?: any): void {
    this.parent.log(`[${this.agentName}] ${message}`, data);
  }

  warn(message: string, data?: any): void {
    this.parent.warn(`[${this.agentName}] ${message}`, data);
  }

  error(message: string, error?: any): void {
    this.parent.error(`[${this.agentName}] ${message}`, error);
  }

  debug(message: string, data?: any): void {
    this.parent.debug(`[${this.agentName}] ${message}`, data);
  }
}