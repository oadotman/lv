-- =====================================================
-- MULTI-AGENT SYSTEM DATABASE SCHEMA (FIXED)
-- Phase 5: Complete agent tracking and performance
-- Date: 2025-01-02
-- Fixed: Removed invalid constraint with date_trunc function
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
    execution_id UUID REFERENCES agent_execution_logs(id),

    -- Output data
    output_data JSONB NOT NULL, -- Full agent output
    output_type TEXT, -- classification, extraction, validation, etc.

    -- Quality metrics
    confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
    quality_score NUMERIC CHECK (quality_score >= 0 AND quality_score <= 1),
    completeness NUMERIC CHECK (completeness >= 0 AND completeness <= 1),

    -- Validation
    validation_status TEXT, -- passed, failed, needs_review
    validation_errors JSONB,
    manual_review_required BOOLEAN DEFAULT false,

    -- User corrections
    has_corrections BOOLEAN DEFAULT false,
    correction_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_agent_output UNIQUE(call_id, agent_name)
);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_call_id ON agent_outputs(call_id);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_org_id ON agent_outputs(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_agent_name ON agent_outputs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_confidence ON agent_outputs(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_agent_outputs_review ON agent_outputs(manual_review_required) WHERE manual_review_required = true;

-- =====================================================
-- 3. AGENT PERFORMANCE METRICS
-- Aggregated performance metrics for monitoring
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Time period
    metric_date DATE NOT NULL,
    metric_hour INTEGER CHECK (metric_hour >= 0 AND metric_hour < 24),

    -- Agent identification
    agent_name TEXT NOT NULL,

    -- Execution metrics
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,

    -- Performance metrics
    avg_execution_time_ms INTEGER,
    min_execution_time_ms INTEGER,
    max_execution_time_ms INTEGER,
    p50_execution_time_ms INTEGER,
    p95_execution_time_ms INTEGER,
    p99_execution_time_ms INTEGER,

    -- Token usage
    total_tokens_used INTEGER DEFAULT 0,
    avg_tokens_per_execution INTEGER,

    -- Quality metrics
    avg_confidence NUMERIC,
    avg_quality_score NUMERIC,
    avg_completeness NUMERIC,

    -- Error metrics
    timeout_count INTEGER DEFAULT 0,
    api_error_count INTEGER DEFAULT 0,
    validation_error_count INTEGER DEFAULT 0,

    -- Cost tracking
    estimated_cost NUMERIC(10, 4),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_metric_period UNIQUE(organization_id, metric_date, agent_name)
);

CREATE INDEX IF NOT EXISTS idx_performance_org_date ON agent_performance_metrics(organization_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_performance_agent ON agent_performance_metrics(agent_name);
CREATE INDEX IF NOT EXISTS idx_performance_date ON agent_performance_metrics(metric_date DESC);

-- =====================================================
-- 4. AGENT DEPENDENCIES
-- Track agent dependencies and execution order
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Agent relationship
    agent_name TEXT NOT NULL,
    depends_on_agent TEXT NOT NULL,
    dependency_type TEXT NOT NULL, -- required, optional, conditional

    -- Execution rules
    execution_order INTEGER,
    can_run_parallel BOOLEAN DEFAULT false,
    timeout_ms INTEGER DEFAULT 10000,

    -- Failure handling
    fail_on_dependency_error BOOLEAN DEFAULT true,
    fallback_strategy TEXT, -- skip, use_default, retry

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_dependency UNIQUE(agent_name, depends_on_agent)
);

CREATE INDEX IF NOT EXISTS idx_dependencies_agent ON agent_dependencies(agent_name);
CREATE INDEX IF NOT EXISTS idx_dependencies_depends_on ON agent_dependencies(depends_on_agent);

-- =====================================================
-- 5. AGENT CONFIGURATIONS
-- Dynamic agent configuration storage
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Agent identification
    agent_name TEXT NOT NULL,

    -- Configuration
    config_data JSONB NOT NULL, -- Agent-specific configuration
    prompt_template TEXT, -- Custom prompt template if applicable
    model_settings JSONB, -- Model-specific settings (temperature, max_tokens, etc.)

    -- Versioning
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,

    -- Performance settings
    max_retries INTEGER DEFAULT 3,
    timeout_ms INTEGER DEFAULT 10000,
    cache_ttl_seconds INTEGER DEFAULT 300,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),

    CONSTRAINT unique_org_agent_config UNIQUE(organization_id, agent_name, version)
);

CREATE INDEX IF NOT EXISTS idx_config_org_agent ON agent_configurations(organization_id, agent_name);
CREATE INDEX IF NOT EXISTS idx_config_active ON agent_configurations(is_active) WHERE is_active = true;

-- =====================================================
-- 6. AGENT ERROR LOGS
-- Detailed error tracking for debugging
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Agent identification
    agent_name TEXT NOT NULL,
    agent_version TEXT,
    execution_id UUID REFERENCES agent_execution_logs(id),

    -- Error details
    error_type TEXT NOT NULL, -- timeout, api_error, validation_error, etc.
    error_message TEXT NOT NULL,
    error_code TEXT,
    stack_trace TEXT,

    -- Context
    input_data JSONB, -- What was being processed
    partial_output JSONB, -- Any partial results before error
    retry_attempt INTEGER DEFAULT 0,

    -- Recovery
    recovery_attempted BOOLEAN DEFAULT false,
    recovery_successful BOOLEAN DEFAULT false,
    recovery_method TEXT, -- How recovery was attempted

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create composite index for deduplication queries
-- Note: We'll handle per-minute deduplication at the application level
CREATE INDEX idx_error_dedup
    ON agent_error_logs(organization_id, agent_name, error_type, created_at);

CREATE INDEX IF NOT EXISTS idx_error_logs_org_id ON agent_error_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_agent ON agent_error_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON agent_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON agent_error_logs(created_at DESC);

-- =====================================================
-- 7. VALIDATION RESULTS TABLE
-- Store validation agent results
-- =====================================================

CREATE TABLE IF NOT EXISTS validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Validation status
    is_valid BOOLEAN NOT NULL,
    validation_score NUMERIC CHECK (validation_score >= 0 AND validation_score <= 1),
    completeness_score NUMERIC CHECK (completeness_score >= 0 AND completeness_score <= 1),

    -- Issues found
    issues JSONB, -- Array of validation issues
    critical_issues_count INTEGER DEFAULT 0,
    major_issues_count INTEGER DEFAULT 0,
    minor_issues_count INTEGER DEFAULT 0,

    -- Cross-agent checks
    cross_agent_conflicts JSONB, -- Conflicts between agents
    data_consistency_score NUMERIC,

    -- Recommendations
    recommendations JSONB, -- Suggested corrections
    manual_review_required BOOLEAN DEFAULT false,
    review_reason TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_validation_result UNIQUE(call_id)
);

CREATE INDEX IF NOT EXISTS idx_validation_call ON validation_results(call_id);
CREATE INDEX IF NOT EXISTS idx_validation_org ON validation_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_validation_review ON validation_results(manual_review_required) WHERE manual_review_required = true;

-- =====================================================
-- 8. EXTRACTION SUMMARIES TABLE
-- Store summary agent results
-- =====================================================

CREATE TABLE IF NOT EXISTS extraction_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Summary content
    executive_summary TEXT NOT NULL,
    headline TEXT,

    -- Structured summary
    call_summary JSONB, -- Complete call summary structure
    key_insights JSONB, -- Array of insights with importance
    action_items JSONB, -- Consolidated action items
    next_steps JSONB, -- Immediate next steps

    -- Risk and opportunities
    risks JSONB, -- Identified risks
    opportunities JSONB, -- Identified opportunities

    -- Communication analysis
    tone TEXT,
    negotiation_style TEXT,
    relationship_status TEXT,

    -- Templates
    email_subject TEXT,
    sms_message TEXT,
    internal_note TEXT,

    -- Data quality
    extraction_completeness NUMERIC,
    confidence_level TEXT,
    data_quality_score NUMERIC,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_extraction_summary UNIQUE(call_id)
);

CREATE INDEX IF NOT EXISTS idx_summary_call ON extraction_summaries(call_id);
CREATE INDEX IF NOT EXISTS idx_summary_org ON extraction_summaries(organization_id);
CREATE INDEX IF NOT EXISTS idx_summary_created ON extraction_summaries(created_at DESC);

-- =====================================================
-- 9. EXTRACTION COMPARISONS TABLE (for A/B testing)
-- Compare old vs new extraction methods
-- =====================================================

CREATE TABLE IF NOT EXISTS extraction_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Extraction versions
    legacy_output JSONB, -- Old extraction method output
    multi_agent_output JSONB, -- New multi-agent output

    -- Performance comparison
    legacy_execution_time_ms INTEGER,
    multi_agent_execution_time_ms INTEGER,
    legacy_token_usage INTEGER,
    multi_agent_token_usage INTEGER,

    -- Quality comparison
    legacy_quality_score NUMERIC,
    multi_agent_quality_score NUMERIC,
    legacy_completeness NUMERIC,
    multi_agent_completeness NUMERIC,

    -- Human review
    reviewed BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    preferred_version TEXT, -- legacy or multi_agent
    review_notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_comparison UNIQUE(call_id)
);

CREATE INDEX IF NOT EXISTS idx_comparison_call ON extraction_comparisons(call_id);
CREATE INDEX IF NOT EXISTS idx_comparison_org ON extraction_comparisons(organization_id);
CREATE INDEX IF NOT EXISTS idx_comparison_reviewed ON extraction_comparisons(reviewed);

-- =====================================================
-- 10. AGENT FEATURE FLAGS TABLE
-- Control agent rollout and A/B testing
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Feature flags
    multi_agent_enabled BOOLEAN DEFAULT false,
    validation_agent_enabled BOOLEAN DEFAULT true,
    summary_agent_enabled BOOLEAN DEFAULT true,

    -- Rollout control
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    comparison_mode BOOLEAN DEFAULT false, -- Run both old and new for comparison

    -- Agent-specific flags
    enabled_agents TEXT[] DEFAULT ARRAY[]::TEXT[],
    disabled_agents TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Configuration overrides
    config_overrides JSONB,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_org_flags UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_flags_org ON agent_feature_flags(organization_id);
CREATE INDEX IF NOT EXISTS idx_flags_enabled ON agent_feature_flags(multi_agent_enabled) WHERE multi_agent_enabled = true;

-- =====================================================
-- 11. AGENT CACHE TABLE
-- Cache agent results for performance
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cache key
    cache_key TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Cached data
    cached_result JSONB NOT NULL,
    input_hash TEXT NOT NULL,

    -- Cache metadata
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_cache_key UNIQUE(cache_key, agent_name)
);

CREATE INDEX IF NOT EXISTS idx_cache_key ON agent_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_agent ON agent_cache(agent_name);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON agent_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_org ON agent_cache(organization_id);

-- Cleanup expired cache entries periodically
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM agent_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. FUNCTIONS FOR METRICS AGGREGATION
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
-- 13. VIEWS FOR MONITORING
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
-- 14. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE agent_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for each table
-- Note: These assume a user_organizations table exists. Adjust based on your schema.

-- Policies for agent_execution_logs
CREATE POLICY "Users can view their org's agent logs"
    ON agent_execution_logs FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "System can insert agent logs"
    ON agent_execution_logs FOR INSERT
    WITH CHECK (true);

-- Policies for agent_outputs
CREATE POLICY "Users can view their org's agent outputs"
    ON agent_outputs FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "System can manage agent outputs"
    ON agent_outputs FOR ALL
    WITH CHECK (true);

-- Policies for validation_results
CREATE POLICY "Users can view their org's validation results"
    ON validation_results FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "System can manage validation results"
    ON validation_results FOR ALL
    WITH CHECK (true);

-- Policies for extraction_summaries
CREATE POLICY "Users can view their org's extraction summaries"
    ON extraction_summaries FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "System can manage extraction summaries"
    ON extraction_summaries FOR ALL
    WITH CHECK (true);

-- Policies for agent_performance_metrics
CREATE POLICY "Users can view their org's performance metrics"
    ON agent_performance_metrics FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
    ));

-- Policies for extraction_comparisons
CREATE POLICY "Users can view their org's comparisons"
    ON extraction_comparisons FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update comparison reviews"
    ON extraction_comparisons FOR UPDATE
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Policies for agent_feature_flags
CREATE POLICY "Admins can manage feature flags"
    ON agent_feature_flags FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

CREATE POLICY "Users can view their org's feature flags"
    ON agent_feature_flags FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
    ));

-- Policies for agent_error_logs
CREATE POLICY "Users can view their org's error logs"
    ON agent_error_logs FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "System can insert error logs"
    ON agent_error_logs FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- 15. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant specific permissions for tables that need updates
GRANT UPDATE ON extraction_comparisons TO authenticated;
GRANT UPDATE ON agent_feature_flags TO authenticated;

-- Service role gets full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- END OF MIGRATION
-- =====================================================