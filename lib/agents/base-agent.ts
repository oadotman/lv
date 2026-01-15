/**
 * Base Agent class that all extraction agents extend
 */

import OpenAI from 'openai';
import {
  IAgent,
  AgentContextData,
  AgentExecutionConfig,
  AgentError,
  BaseAgentOutput,
  ConfidenceScore,
  ConfidenceLevel
} from './types';

export abstract class BaseAgent<TInput = any, TOutput extends BaseAgentOutput = BaseAgentOutput>
  implements IAgent<TInput, TOutput> {

  public abstract name: string;
  public abstract version: string;
  public abstract description: string;
  public dependencies?: string[] = [];

  protected openai: OpenAI | null = null;

  public config: AgentExecutionConfig = {
    timeout: 30000,
    retryOnFailure: false,
    critical: false,
    parallel: false,
    optional: false
  };

  constructor(config?: Partial<AgentExecutionConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Initialize OpenAI client lazily
   */
  protected getOpenAI(): OpenAI {
    if (!this.openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.openai;
  }

  /**
   * Main execution method - must be implemented by each agent
   */
  abstract execute(context: AgentContextData, input?: TInput): Promise<TOutput>;

  /**
   * Get the prompt for this agent - can be overridden
   */
  abstract getPrompt(context: AgentContextData): string;

  /**
   * Get the system prompt for this agent - can be overridden
   */
  protected getSystemPrompt(): string {
    return `You are an expert extraction agent for LoadVoice, specializing in ${this.description}.
Extract only what is explicitly mentioned or strongly implied in the transcript.
Return valid JSON without any markdown formatting or code blocks.
If information is not present, use null or omit the field.`;
  }

  /**
   * Call OpenAI with the agent's prompt
   */
  protected async callOpenAI(
    prompt: string,
    systemPrompt?: string,
    temperature: number = 0.3,
    model: string = 'gpt-4o-mini'
  ): Promise<any> {
    const client = this.getOpenAI();

    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt || this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      return JSON.parse(content);
    } catch (error) {
      throw this.handleError(error as Error);
    }
  }

  /**
   * Validate input before processing
   */
  validateInput(input: any): boolean {
    // Basic validation - can be overridden
    if (!input) return false;
    return true;
  }

  /**
   * Validate output after processing
   */
  validateOutput(output: any): boolean {
    // Basic validation - can be overridden
    if (!output) return false;
    if (!output.confidence) return false;
    return true;
  }

  /**
   * Handle errors and convert to AgentError
   */
  handleError(error: Error): AgentError {
    // Check for known error types
    if (error.message.includes('timeout')) {
      return {
        code: 'TIMEOUT',
        message: `Agent ${this.name} timed out`,
        recoverable: true,
        details: { originalError: error.message }
      };
    }

    if (error.message.includes('JSON')) {
      return {
        code: 'PARSE_ERROR',
        message: `Agent ${this.name} failed to parse response`,
        recoverable: true,
        details: { originalError: error.message }
      };
    }

    if (error.message.includes('API')) {
      return {
        code: 'API_ERROR',
        message: `OpenAI API error in agent ${this.name}`,
        recoverable: false,
        details: { originalError: error.message }
      };
    }

    // Default error
    return {
      code: 'UNKNOWN',
      message: `Agent ${this.name} encountered an error: ${error.message}`,
      recoverable: false,
      details: { originalError: error.message }
    };
  }

  /**
   * Get default output when agent fails
   */
  abstract getDefaultOutput(): TOutput;

  /**
   * Determine if this agent should execute based on context
   */
  shouldExecute(context: AgentContextData): boolean {
    // Check if dependencies have completed successfully
    if (this.dependencies && this.dependencies.length > 0) {
      for (const dep of this.dependencies) {
        const depResult = context.agentOutputs.get(dep);
        if (!depResult || depResult.status !== 'completed') {
          return false;
        }
      }
    }

    // Additional checks can be added by specific agents
    return true;
  }

  /**
   * Helper to calculate confidence score
   */
  protected calculateConfidence(factors: { [key: string]: number }): ConfidenceScore {
    const weights = Object.values(factors);
    const avgConfidence = weights.reduce((a, b) => a + b, 0) / weights.length;

    let level: ConfidenceLevel;
    if (avgConfidence >= 0.8) level = 'high';
    else if (avgConfidence >= 0.5) level = 'medium';
    else level = 'low';

    return {
      value: avgConfidence,
      level,
      factors: Object.entries(factors).map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`)
    };
  }

  /**
   * Helper to extract text between utterances
   */
  protected getUtteranceText(
    context: AgentContextData,
    startIdx?: number,
    endIdx?: number
  ): string {
    const utterances = context.utterances.slice(startIdx, endIdx);
    return utterances.map(u => u.text).join(' ');
  }

  /**
   * Helper to find utterances by speaker
   */
  protected getUtterancesBySpeaker(
    context: AgentContextData,
    speakerId: string
  ): string[] {
    return context.utterances
      .filter(u => u.speaker === speakerId)
      .map(u => u.text);
  }

  /**
   * Helper to search for keywords in transcript
   */
  protected findKeywords(
    transcript: string,
    keywords: string[],
    caseSensitive: boolean = false
  ): { found: string[], positions: Map<string, number[]> } {
    const text = caseSensitive ? transcript : transcript.toLowerCase();
    const found: string[] = [];
    const positions = new Map<string, number[]>();

    for (const keyword of keywords) {
      const searchTerm = caseSensitive ? keyword : keyword.toLowerCase();
      const regex = new RegExp(`\\b${searchTerm}\\b`, 'g');
      const matches = [...text.matchAll(regex)];

      if (matches.length > 0) {
        found.push(keyword);
        positions.set(keyword, matches.map(m => m.index || 0));
      }
    }

    return { found, positions };
  }

  /**
   * Helper to clean and normalize extracted data
   */
  protected cleanExtractedData(data: any): any {
    if (typeof data === 'string') {
      // Remove extra whitespace
      return data.trim().replace(/\s+/g, ' ');
    }

    if (Array.isArray(data)) {
      return data.map(item => this.cleanExtractedData(item)).filter(Boolean);
    }

    if (typeof data === 'object' && data !== null) {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined && value !== '') {
          cleaned[key] = this.cleanExtractedData(value);
        }
      }
      return cleaned;
    }

    return data;
  }

  /**
   * Log agent execution
   */
  protected log(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.name}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  /**
   * Log warning
   */
  protected warn(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [${this.name}] WARNING: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  /**
   * Log error
   */
  protected error(message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${this.name}] ERROR: ${message}`, error);
  }
}