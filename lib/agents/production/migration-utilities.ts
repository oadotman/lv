/**
 * Migration Utilities for Multi-Agent System
 * Handles migration of existing data and gradual rollout
 */

import { createClient } from '@supabase/supabase-js';
import ProductionOrchestrator from './production-orchestrator';

export interface MigrationConfig {
  batchSize: number;
  delayBetweenBatches: number;
  startDate?: Date;
  endDate?: Date;
  organizationIds?: string[];
  dryRun: boolean;
}

export interface MigrationResult {
  totalCalls: number;
  processedCalls: number;
  successfulCalls: number;
  failedCalls: number;
  errors: any[];
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
}

export class MigrationUtilities {
  private static instance: MigrationUtilities;
  private supabase: any;
  private orchestrator: any;
  private migrationStatus: Map<string, MigrationResult> = new Map();
  private cancelTokens: Map<string, boolean> = new Map();

  private constructor() {
    this.orchestrator = ProductionOrchestrator;

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }
  }

  static getInstance(): MigrationUtilities {
    if (!MigrationUtilities.instance) {
      MigrationUtilities.instance = new MigrationUtilities();
    }
    return MigrationUtilities.instance;
  }

  /**
   * Migrate existing calls to multi-agent system
   */
  async migrateCalls(config: MigrationConfig): Promise<string> {
    const migrationId = this.generateMigrationId();
    const result: MigrationResult = {
      totalCalls: 0,
      processedCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      errors: [],
      startTime: new Date(),
      status: 'running'
    };

    this.migrationStatus.set(migrationId, result);

    // Run migration in background
    this.runMigration(migrationId, config).catch(err => {
      console.error('Migration failed:', err);
      result.status = 'failed';
      result.errors.push(err.message);
    });

    return migrationId;
  }

  /**
   * Run migration process
   */
  private async runMigration(
    migrationId: string,
    config: MigrationConfig
  ): Promise<void> {
    const result = this.migrationStatus.get(migrationId)!;

    try {
      // Get calls to migrate
      const calls = await this.getCallsToMigrate(config);
      result.totalCalls = calls.length;

      console.log(`Starting migration of ${calls.length} calls`);

      // Process in batches
      for (let i = 0; i < calls.length; i += config.batchSize) {
        // Check for cancellation
        if (this.cancelTokens.get(migrationId)) {
          result.status = 'cancelled';
          break;
        }

        const batch = calls.slice(i, i + config.batchSize);
        console.log(`Processing batch ${i / config.batchSize + 1} (${batch.length} calls)`);

        await this.processBatch(batch, config, result);

        result.processedCalls = Math.min(i + config.batchSize, calls.length);

        // Delay between batches
        if (i + config.batchSize < calls.length) {
          await this.delay(config.delayBetweenBatches);
        }
      }

      result.endTime = new Date();
      result.status = result.status === 'running' ? 'completed' : result.status;

      console.log(`Migration completed: ${result.successfulCalls}/${result.totalCalls} successful`);

      // Store migration result
      await this.storeMigrationResult(migrationId, result);
    } catch (error: any) {
      result.status = 'failed';
      result.errors.push(error.message);
      result.endTime = new Date();
      throw error;
    }
  }

  /**
   * Get calls to migrate based on config
   */
  private async getCallsToMigrate(config: MigrationConfig): Promise<any[]> {
    if (!this.supabase) return [];

    let query = this.supabase
      .from('calls')
      .select('id, organization_id, file_url')
      .eq('status', 'completed')
      .is('deleted_at', null);

    // Add date filters
    if (config.startDate) {
      query = query.gte('created_at', config.startDate.toISOString());
    }
    if (config.endDate) {
      query = query.lte('created_at', config.endDate.toISOString());
    }

    // Add organization filter
    if (config.organizationIds && config.organizationIds.length > 0) {
      query = query.in('organization_id', config.organizationIds);
    }

    // Check if already processed
    query = query.is('multi_agent_processed', null);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch calls: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Process a batch of calls
   */
  private async processBatch(
    calls: any[],
    config: MigrationConfig,
    result: MigrationResult
  ): Promise<void> {
    const promises = calls.map(async call => {
      try {
        if (config.dryRun) {
          console.log(`[DRY RUN] Would process call ${call.id}`);
          result.successfulCalls++;
          return;
        }

        // Get transcript
        const transcript = await this.getTranscript(call.id);
        if (!transcript) {
          throw new Error('No transcript found');
        }

        // Process with multi-agent system
        const processingResult = await this.orchestrator.processCall(
          call.id,
          transcript,
          call.organization_id,
          { migration: true }
        );

        if (processingResult.success) {
          result.successfulCalls++;

          // Mark as processed
          await this.markAsProcessed(call.id);
        } else {
          result.failedCalls++;
          result.errors.push({
            callId: call.id,
            error: processingResult.errors?.[0] || 'Unknown error'
          });
        }
      } catch (error: any) {
        result.failedCalls++;
        result.errors.push({
          callId: call.id,
          error: error.message
        });
        console.error(`Failed to process call ${call.id}:`, error.message);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get transcript for a call
   */
  private async getTranscript(callId: string): Promise<string | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('transcripts')
      .select('full_text, text')
      .eq('call_id', callId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.full_text || data.text || null;
  }

  /**
   * Mark call as processed by multi-agent system
   */
  private async markAsProcessed(callId: string): Promise<void> {
    if (!this.supabase) return;

    await this.supabase
      .from('calls')
      .update({
        multi_agent_processed: true,
        multi_agent_processed_at: new Date().toISOString()
      })
      .eq('id', callId);
  }

  /**
   * Store migration result in database
   */
  private async storeMigrationResult(
    migrationId: string,
    result: MigrationResult
  ): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase
        .from('system_logs')
        .insert({
          log_type: 'migration',
          message: `Migration ${migrationId} completed`,
          metadata: {
            migrationId,
            ...result
          }
        });
    } catch (err) {
      console.error('Failed to store migration result:', err);
    }
  }

  /**
   * Get migration status
   */
  getMigrationStatus(migrationId: string): MigrationResult | null {
    return this.migrationStatus.get(migrationId) || null;
  }

  /**
   * Cancel migration
   */
  cancelMigration(migrationId: string): boolean {
    if (!this.migrationStatus.has(migrationId)) {
      return false;
    }

    this.cancelTokens.set(migrationId, true);
    return true;
  }

  /**
   * Re-process failed calls from a migration
   */
  async reprocessFailed(migrationId: string): Promise<string> {
    const originalResult = this.migrationStatus.get(migrationId);
    if (!originalResult || originalResult.errors.length === 0) {
      throw new Error('No failed calls to reprocess');
    }

    const failedCallIds = originalResult.errors
      .filter(e => e.callId)
      .map(e => e.callId);

    const newConfig: MigrationConfig = {
      batchSize: 10,
      delayBetweenBatches: 1000,
      dryRun: false
    };

    const newMigrationId = this.generateMigrationId();
    const newResult: MigrationResult = {
      totalCalls: failedCallIds.length,
      processedCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      errors: [],
      startTime: new Date(),
      status: 'running'
    };

    this.migrationStatus.set(newMigrationId, newResult);

    // Get call data
    const calls = await this.getCallsByIds(failedCallIds);

    // Process
    this.processBatch(calls, newConfig, newResult).then(() => {
      newResult.status = 'completed';
      newResult.endTime = new Date();
    }).catch(err => {
      newResult.status = 'failed';
      newResult.errors.push(err.message);
      newResult.endTime = new Date();
    });

    return newMigrationId;
  }

  /**
   * Get calls by IDs
   */
  private async getCallsByIds(callIds: string[]): Promise<any[]> {
    if (!this.supabase) return [];

    const { data, error } = await this.supabase
      .from('calls')
      .select('id, organization_id, file_url')
      .in('id', callIds);

    if (error) {
      throw new Error(`Failed to fetch calls: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Generate migration ID
   */
  private generateMigrationId(): string {
    return `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get migration statistics
   */
  async getMigrationStatistics(): Promise<any> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('calls')
      .select('multi_agent_processed', { count: 'exact' });

    if (error) return null;

    const total = data?.length || 0;
    const processed = data?.filter(c => c.multi_agent_processed).length || 0;

    return {
      totalCalls: total,
      processedCalls: processed,
      remainingCalls: total - processed,
      percentageComplete: total > 0 ? (processed / total * 100).toFixed(2) : 0
    };
  }
}

// Export singleton instance
export default MigrationUtilities.getInstance();