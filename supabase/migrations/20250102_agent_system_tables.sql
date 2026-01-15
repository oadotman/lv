-- =====================================================
-- MULTI-AGENT SYSTEM DATABASE SCHEMA
-- Phase 5: Complete agent tracking and performance
-- Date: 2025-01-02
-- =====================================================

-- =====================================================
-- 1. AGENT EXECUTION LOGS
-- Track every agent execution for monitoring
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Agent details
    agent_name TEXT NOT NULL,
    agent_version TEXT,

    -- Execution metrics
    execution_time_ms INTEGER NOT NULL,
    tokens_used INTEGER,
    success BOOLEAN NOT NULL DEFAULT false,

    -- Error tracking
    error_message TEXT,
    error_type TEXT, -- timeout, api_error, validation_error, etc.
    retry_count INTEGER DEFAULT 0,

    -- Input/output hashes for debugging
    input_hash TEXT, -- Hash of input for caching
    output_hash TEXT, -- Hash of output for validation

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes
    CONSTRAINT idx_unique_agent_call UNIQUE(call_id, agent_name, created_at)
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_call_id ON agent_execution_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_org_id ON agent_execution_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_name ON agent_execution_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON agent_execution_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_logs_success ON agent_execution_logs(success);

-- =====================================================
-- 2. AGENT OUTPUTS
-- Store detailed agent outputs for analysis
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Agent identification
    agent_name TEXT NOT NULL,
    agent_version TEXT,

    -- Output data
    output JSONB NOT NULL, -- Complete agent output
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),

    -- Validation results
    validation_status TEXT, -- valid, invalid, partial
    validation_issues JSONB, -- Array of validation issues

    -- Quality metrics
    quality_score FLOAT CHECK (quality_score >= 0 AND quality_score <= 100),
    completeness FLOAT CHECK (completeness >= 0 AND completeness <= 1),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one output per agent per call
    CONSTRAINT unique_agent_output UNIQUE(call_id, agent_name)
);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_call_id ON agent_outputs(call_id);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_org_id ON agent_outputs(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_agent_name ON agent_outputs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_confidence ON agent_outputs(confidence);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_created_at ON agent_outputs(created_at);

-- =====================================================
-- 3. AGENT PERFORMANCE METRICS (Aggregated)
-- Daily rollup of agent performance
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Time window
    metric_date DATE NOT NULL,
    agent_name TEXT NOT NULL,

    -- Performance metrics
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,

    -- Timing metrics (milliseconds)
    avg_execution_time_ms INTEGER,
    min_execution_time_ms INTEGER,
    max_execution_time_ms INTEGER,
    p50_execution_time_ms INTEGER, -- Median
    p95_execution_time_ms INTEGER, -- 95th percentile
    p99_execution_time_ms INTEGER, -- 99th percentile

    -- Token usage
    total_tokens_used INTEGER DEFAULT 0,
    avg_tokens_per_execution INTEGER,

    -- Quality metrics
    avg_confidence FLOAT,
    avg_quality_score FLOAT,
    avg_completeness FLOAT,

    -- Error analysis
    timeout_count INTEGER DEFAULT 0,
    api_error_count INTEGER DEFAULT 0,
    validation_error_count INTEGER DEFAULT 0,

    -- Cost tracking
    estimated_cost DECIMAL(10, 4), -- Based on token usage

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint for daily metrics
    CONSTRAINT unique_daily_agent_metrics UNIQUE(organization_id, metric_date, agent_name)
);

CREATE INDEX IF NOT EXISTS idx_agent_metrics_org_date ON agent_performance_metrics(organization_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_name ON agent_performance_metrics(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_date ON agent_performance_metrics(metric_date DESC);

-- =====================================================
-- 4. EXTRACTION COMPARISON (For A/B Testing)
-- Compare multi-agent vs monolithic extraction
-- =====================================================

CREATE TABLE IF NOT EXISTS extraction_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Extraction methods
    multi_agent_output JSONB NOT NULL,
    monolithic_output JSONB NOT NULL,

    -- Performance comparison
    multi_agent_time_ms INTEGER,
    monolithic_time_ms INTEGER,

    -- Quality comparison
    multi_agent_confidence FLOAT,
    monolithic_confidence FLOAT,

    -- Field-by-field comparison
    field_matches JSONB, -- Which fields matched
    field_conflicts JSONB, -- Which fields differed
    match_percentage FLOAT, -- Overall match %

    -- Human review (if performed)
    reviewed BOOLEAN DEFAULT false,
    reviewer_id UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    preferred_method TEXT, -- multi_agent, monolithic, mixed
    review_notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extraction_comp_call_id ON extraction_comparisons(call_id);
CREATE INDEX IF NOT EXISTS idx_extraction_comp_org_id ON extraction_comparisons(organization_id);
CREATE INDEX IF NOT EXISTS idx_extraction_comp_reviewed ON extraction_comparisons(reviewed);

-- =====================================================
-- 5. AGENT FEATURE FLAGS
-- Control agent rollout per organization
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Feature flags
    multi_agent_enabled BOOLEAN DEFAULT false,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),

    -- Specific agent toggles
    enabled_agents TEXT[], -- List of enabled agent names
    disabled_agents TEXT[], -- List of explicitly disabled agents

    -- Comparison mode
    comparison_mode BOOLEAN DEFAULT false, -- Run both systems for comparison

    -- Performance thresholds
    max_execution_time_ms INTEGER DEFAULT 30000, -- Maximum allowed execution time
    min_confidence_threshold FLOAT DEFAULT 0.6, -- Minimum confidence to accept results

    -- Metadata
    enabled_at TIMESTAMPTZ,
    enabled_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique per organization
    CONSTRAINT unique_org_feature_flags UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_org_id ON agent_feature_flags(organization_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON agent_feature_flags(multi_agent_enabled);

-- =====================================================
-- 6. AGENT ERROR LOG
-- Detailed error tracking for debugging
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Error details
    agent_name TEXT NOT NULL,
    error_type TEXT NOT NULL, -- timeout, api_error, validation, etc.
    error_message TEXT NOT NULL,
    error_stack TEXT, -- Full stack trace

    -- Context
    input_data JSONB, -- Input that caused error
    partial_output JSONB, -- Any partial output before error

    -- Recovery
    recovery_attempted BOOLEAN DEFAULT false,
    recovery_successful BOOLEAN DEFAULT false,
    recovery_method TEXT, -- How recovery was attempted

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent spam
    CONSTRAINT unique_error_per_minute UNIQUE(organization_id, agent_name, error_type, date_trunc('minute', created_at))
);

CREATE INDEX IF NOT EXISTS idx_error_logs_org_id ON agent_error_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_agent ON agent_error_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON agent_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON agent_error_logs(created_at DESC);

-- =====================================================
-- 7. FUNCTIONS FOR METRICS AGGREGATION
-- =====================================================

-- Function to update daily performance metrics
CREATE OR REPLACE FUNCTION update_agent_performance_metrics()
RETURNS void AS $$
BEGIN
    INSERT INTO agent_performance_metrics (
        organization_id,
        metric_date,
        agent_name,
        total_executions,
        successful_executions,
        failed_executions,
        avg_execution_time_ms,
        min_execution_time_ms,
        max_execution_time_ms,
        p50_execution_time_ms,
        p95_execution_time_ms,
        p99_execution_time_ms,
        total_tokens_used,
        avg_tokens_per_execution,
        avg_confidence,
        avg_quality_score,
        avg_completeness,
        timeout_count,
        api_error_count,
        validation_error_count
    )
    SELECT
        ael.organization_id,
        date_trunc('day', ael.created_at)::date as metric_date,
        ael.agent_name,
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE ael.success = true) as successful_executions,
        COUNT(*) FILTER (WHERE ael.success = false) as failed_executions,
        AVG(ael.execution_time_ms)::INTEGER as avg_execution_time_ms,
        MIN(ael.execution_time_ms) as min_execution_time_ms,
        MAX(ael.execution_time_ms) as max_execution_time_ms,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ael.execution_time_ms)::INTEGER as p50_execution_time_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ael.execution_time_ms)::INTEGER as p95_execution_time_ms,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY ael.execution_time_ms)::INTEGER as p99_execution_time_ms,
        COALESCE(SUM(ael.tokens_used), 0) as total_tokens_used,
        AVG(ael.tokens_used)::INTEGER as avg_tokens_per_execution,
        AVG(ao.confidence) as avg_confidence,
        AVG(ao.quality_score) as avg_quality_score,
        AVG(ao.completeness) as avg_completeness,
        COUNT(*) FILTER (WHERE ael.error_type = 'timeout') as timeout_count,
        COUNT(*) FILTER (WHERE ael.error_type = 'api_error') as api_error_count,
        COUNT(*) FILTER (WHERE ael.error_type = 'validation_error') as validation_error_count
    FROM agent_execution_logs ael
    LEFT JOIN agent_outputs ao ON ael.call_id = ao.call_id AND ael.agent_name = ao.agent_name
    WHERE ael.created_at >= CURRENT_DATE - INTERVAL '1 day'
    GROUP BY ael.organization_id, date_trunc('day', ael.created_at)::date, ael.agent_name
    ON CONFLICT (organization_id, metric_date, agent_name)
    DO UPDATE SET
        total_executions = EXCLUDED.total_executions,
        successful_executions = EXCLUDED.successful_executions,
        failed_executions = EXCLUDED.failed_executions,
        avg_execution_time_ms = EXCLUDED.avg_execution_time_ms,
        min_execution_time_ms = EXCLUDED.min_execution_time_ms,
        max_execution_time_ms = EXCLUDED.max_execution_time_ms,
        p50_execution_time_ms = EXCLUDED.p50_execution_time_ms,
        p95_execution_time_ms = EXCLUDED.p95_execution_time_ms,
        p99_execution_time_ms = EXCLUDED.p99_execution_time_ms,
        total_tokens_used = EXCLUDED.total_tokens_used,
        avg_tokens_per_execution = EXCLUDED.avg_tokens_per_execution,
        avg_confidence = EXCLUDED.avg_confidence,
        avg_quality_score = EXCLUDED.avg_quality_score,
        avg_completeness = EXCLUDED.avg_completeness,
        timeout_count = EXCLUDED.timeout_count,
        api_error_count = EXCLUDED.api_error_count,
        validation_error_count = EXCLUDED.validation_error_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. VIEWS FOR MONITORING
-- =====================================================

-- Agent performance dashboard view
CREATE OR REPLACE VIEW agent_performance_dashboard AS
SELECT
    apm.organization_id,
    apm.agent_name,
    apm.metric_date,
    apm.total_executions,
    ROUND(100.0 * apm.successful_executions / NULLIF(apm.total_executions, 0), 2) as success_rate,
    apm.avg_execution_time_ms,
    apm.p95_execution_time_ms,
    apm.avg_confidence,
    apm.avg_quality_score,
    ROUND(100.0 * apm.avg_completeness, 2) as completeness_percentage,
    apm.total_tokens_used,
    apm.estimated_cost
FROM agent_performance_metrics apm
WHERE apm.metric_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY apm.metric_date DESC, apm.agent_name;

-- Current agent status view
CREATE OR REPLACE VIEW agent_current_status AS
SELECT
    aff.organization_id,
    o.name as organization_name,
    aff.multi_agent_enabled,
    aff.rollout_percentage,
    aff.comparison_mode,
    array_length(aff.enabled_agents, 1) as enabled_agent_count,
    array_length(aff.disabled_agents, 1) as disabled_agent_count,
    aff.updated_at
FROM agent_feature_flags aff
JOIN organizations o ON aff.organization_id = o.id
ORDER BY o.name;

-- Recent errors view
CREATE OR REPLACE VIEW recent_agent_errors AS
SELECT
    ael.organization_id,
    ael.agent_name,
    ael.error_type,
    COUNT(*) as error_count,
    MAX(ael.created_at) as last_error_at,
    array_agg(DISTINCT ael.error_message ORDER BY ael.error_message) as unique_error_messages
FROM agent_error_logs ael
WHERE ael.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY ael.organization_id, ael.agent_name, ael.error_type
ORDER BY error_count DESC;

-- =====================================================
-- 9. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE agent_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_error_logs ENABLE ROW LEVEL SECURITY;

-- Policies for agent_execution_logs
CREATE POLICY "Users can view their org's agent logs"
    ON agent_execution_logs FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "System can insert agent logs"
    ON agent_execution_logs FOR INSERT
    WITH CHECK (true);

-- Policies for agent_outputs
CREATE POLICY "Users can view their org's agent outputs"
    ON agent_outputs FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "System can manage agent outputs"
    ON agent_outputs FOR ALL
    WITH CHECK (true);

-- Policies for agent_performance_metrics
CREATE POLICY "Users can view their org's performance metrics"
    ON agent_performance_metrics FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
    ));

-- Policies for extraction_comparisons
CREATE POLICY "Users can view their org's comparisons"
    ON extraction_comparisons FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update comparison reviews"
    ON extraction_comparisons FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Policies for agent_feature_flags
CREATE POLICY "Admins can manage feature flags"
    ON agent_feature_flags FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

CREATE POLICY "Users can view their org's feature flags"
    ON agent_feature_flags FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
    ));

-- Policies for agent_error_logs
CREATE POLICY "Users can view their org's error logs"
    ON agent_error_logs FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "System can insert error logs"
    ON agent_error_logs FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- 10. SCHEDULED JOBS (Using pg_cron or external scheduler)
-- =====================================================

-- Daily metrics aggregation (to be scheduled externally)
-- SELECT update_agent_performance_metrics();

-- Cleanup old logs (keep 90 days)
-- DELETE FROM agent_execution_logs WHERE created_at < NOW() - INTERVAL '90 days';
-- DELETE FROM agent_error_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- =====================================================
-- 11. INDEXES FOR PERFORMANCE
-- =====================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_logs_org_agent_date
    ON agent_execution_logs(organization_id, agent_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_call_confidence
    ON agent_outputs(call_id, confidence DESC);

CREATE INDEX IF NOT EXISTS idx_agent_metrics_org_agent_date
    ON agent_performance_metrics(organization_id, agent_name, metric_date DESC);

-- JSONB indexes for searching
CREATE INDEX IF NOT EXISTS idx_agent_outputs_output_gin
    ON agent_outputs USING GIN (output);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_validation_gin
    ON agent_outputs USING GIN (validation_issues);