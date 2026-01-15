-- =====================================================
-- CRITICAL PERFORMANCE INDEXES FOR SCALE (FIXED)
-- Addresses N+1 queries and missing composite indexes
-- Fixed for actual schema without deleted_at columns
-- =====================================================

-- =====================================================
-- CALLS TABLE INDEXES
-- =====================================================

-- Composite index for dashboard and list queries
CREATE INDEX IF NOT EXISTS idx_calls_org_status_created
ON calls(organization_id, status, created_at DESC);

-- Index for processing queue queries
CREATE INDEX IF NOT EXISTS idx_calls_status_processing
ON calls(status, created_at ASC)
WHERE status IN ('uploaded', 'queued', 'processing', 'transcribing', 'extracting');

-- Index for user's calls
CREATE INDEX IF NOT EXISTS idx_calls_user_created
ON calls(user_id, created_at DESC);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_calls_org_date_range
ON calls(organization_id, created_at);

-- Index for template-based calls
CREATE INDEX IF NOT EXISTS idx_calls_template
ON calls(template_id)
WHERE template_id IS NOT NULL;

-- =====================================================
-- CARRIERS TABLE INDEXES
-- =====================================================

-- Composite index for carrier searches
CREATE INDEX IF NOT EXISTS idx_carriers_org_last_used
ON carriers(organization_id, last_used_date DESC NULLS LAST);

-- Index for carrier status queries
CREATE INDEX IF NOT EXISTS idx_carriers_org_status
ON carriers(organization_id, status);

-- Index for equipment type searches (GIN for array containment)
CREATE INDEX IF NOT EXISTS idx_carriers_equipment_types
ON carriers USING GIN(equipment_types);

-- Text search index for carrier name
CREATE INDEX IF NOT EXISTS idx_carriers_name_search
ON carriers USING GIN(to_tsvector('english', carrier_name));

-- Index for MC number lookups
CREATE INDEX IF NOT EXISTS idx_carriers_mc_number
ON carriers(mc_number)
WHERE mc_number IS NOT NULL;

-- =====================================================
-- LOADS TABLE INDEXES
-- =====================================================

-- Composite index for load board queries
CREATE INDEX IF NOT EXISTS idx_loads_status_created
ON loads(status, created_at DESC);

-- Index for organization's loads
CREATE INDEX IF NOT EXISTS idx_loads_org_status_created
ON loads(organization_id, status, created_at DESC);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_loads_pickup_date
ON loads(pickup_date);

-- Index for lane-based queries
CREATE INDEX IF NOT EXISTS idx_loads_lane
ON loads(origin_city, origin_state, destination_city, destination_state);

-- Index for carrier assignments
CREATE INDEX IF NOT EXISTS idx_loads_carrier
ON loads(carrier_id)
WHERE carrier_id IS NOT NULL;

-- =====================================================
-- TRANSCRIPTS TABLE INDEXES
-- =====================================================

-- Index for transcript lookups
CREATE INDEX IF NOT EXISTS idx_transcripts_call_id
ON transcripts(call_id);

-- Full text search on transcript content
CREATE INDEX IF NOT EXISTS idx_transcripts_text_search
ON transcripts USING GIN(to_tsvector('english', COALESCE(text, '') || ' ' || COALESCE(full_text, '')))
WHERE text IS NOT NULL OR full_text IS NOT NULL;

-- =====================================================
-- CALL_FIELDS TABLE INDEXES
-- =====================================================

-- Index for field extraction lookups
CREATE INDEX IF NOT EXISTS idx_call_fields_call_id
ON call_fields(call_id);

-- Index for template-based field lookups
CREATE INDEX IF NOT EXISTS idx_call_fields_template
ON call_fields(template_id)
WHERE template_id IS NOT NULL;

-- =====================================================
-- EXTRACTION_MAPPINGS TABLE INDEXES
-- =====================================================

-- Composite index for batch processing
CREATE INDEX IF NOT EXISTS idx_extraction_mappings_call_status
ON extraction_mappings(call_id, status);

-- Index for organization's mappings
CREATE INDEX IF NOT EXISTS idx_extraction_mappings_org_created
ON extraction_mappings(organization_id, created_at DESC);

-- Index for extraction type queries
CREATE INDEX IF NOT EXISTS idx_extraction_mappings_type
ON extraction_mappings(extraction_type, organization_id);

-- =====================================================
-- ORGANIZATIONS TABLE INDEXES
-- =====================================================

-- Index for usage tracking queries
CREATE INDEX IF NOT EXISTS idx_organizations_usage
ON organizations(subscription_status, usage_minutes_current);

-- Index for subscription queries
CREATE INDEX IF NOT EXISTS idx_organizations_subscription
ON organizations(paddle_subscription_id)
WHERE paddle_subscription_id IS NOT NULL;

-- Index for plan type queries
CREATE INDEX IF NOT EXISTS idx_organizations_plan
ON organizations(plan_type, subscription_status);

-- =====================================================
-- PROFILES TABLE INDEXES (NO organization_id IN THIS TABLE)
-- =====================================================

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email
ON profiles(email);

-- =====================================================
-- USER_ORGANIZATIONS TABLE INDEXES
-- =====================================================

-- Index for organization member lookups
CREATE INDEX IF NOT EXISTS idx_user_organizations_org
ON user_organizations(organization_id);

-- Index for user's organizations
CREATE INDEX IF NOT EXISTS idx_user_organizations_user
ON user_organizations(user_id);

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_role
ON user_organizations(organization_id, role);

-- =====================================================
-- USAGE_METRICS TABLE INDEXES
-- =====================================================

-- Composite index for usage tracking
CREATE INDEX IF NOT EXISTS idx_usage_metrics_org_created
ON usage_metrics(organization_id, created_at DESC);

-- Index for metric type queries
CREATE INDEX IF NOT EXISTS idx_usage_metrics_type
ON usage_metrics(metric_type, organization_id);

-- =====================================================
-- PROCESSING_LOCKS TABLE INDEXES
-- =====================================================

-- Index for lock cleanup and checks
CREATE INDEX IF NOT EXISTS idx_processing_locks_org_locked
ON processing_locks(organization_id, locked_at DESC);

-- Index for stale lock detection
CREATE INDEX IF NOT EXISTS idx_processing_locks_stale
ON processing_locks(locked_at);

-- =====================================================
-- CARRIER_INTERACTIONS TABLE INDEXES
-- =====================================================

-- Index for carrier interaction history
CREATE INDEX IF NOT EXISTS idx_carrier_interactions_carrier_date
ON carrier_interactions(carrier_id, interaction_date DESC);

-- Index for user's interactions
CREATE INDEX IF NOT EXISTS idx_carrier_interactions_user_date
ON carrier_interactions(user_id, interaction_date DESC);

-- Index for organization's interactions
CREATE INDEX IF NOT EXISTS idx_carrier_interactions_org
ON carrier_interactions(organization_id);

-- =====================================================
-- LANES TABLE INDEXES
-- =====================================================

-- Index for lane lookups
CREATE INDEX IF NOT EXISTS idx_lanes_route
ON lanes(origin_city, origin_state, destination_city, destination_state);

-- Index for organization's lanes
CREATE INDEX IF NOT EXISTS idx_lanes_org_count
ON lanes(organization_id, load_count DESC);

-- =====================================================
-- AUDIT_LOGS TABLE INDEXES
-- =====================================================

-- Index for audit trail queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
ON audit_logs(resource_type, resource_id, created_at DESC);

-- Index for user activity tracking
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date
ON audit_logs(user_id, created_at DESC);

-- =====================================================
-- RATE_CONFIRMATIONS TABLE INDEXES
-- =====================================================

-- Index for confirmation lookups
CREATE INDEX IF NOT EXISTS idx_rate_confirmations_load
ON rate_confirmations(load_id);

-- Index for organization's confirmations
CREATE INDEX IF NOT EXISTS idx_rate_confirmations_org_created
ON rate_confirmations(organization_id, created_at DESC);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_rate_confirmations_status
ON rate_confirmations(status)
WHERE status IS NOT NULL;

-- =====================================================
-- TWILIO_CALLS TABLE INDEXES
-- =====================================================

-- Index for call SID lookups
CREATE INDEX IF NOT EXISTS idx_twilio_calls_sid
ON twilio_calls(twilio_call_sid);

-- Index for organization's Twilio calls
CREATE INDEX IF NOT EXISTS idx_twilio_calls_org
ON twilio_calls(organization_id)
WHERE organization_id IS NOT NULL;

-- =====================================================
-- TEAM_INVITATIONS TABLE INDEXES
-- =====================================================

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_team_invitations_token
ON team_invitations(token);

-- Index for organization's invitations
CREATE INDEX IF NOT EXISTS idx_team_invitations_org
ON team_invitations(organization_id);

-- =====================================================
-- REFERRALS TABLE INDEXES
-- =====================================================

-- Index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_referrals_code
ON referrals(referral_code);

-- Index for referrer's referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer
ON referrals(referrer_id);

-- =====================================================
-- PARTNERS TABLE INDEXES
-- =====================================================

-- Index for partner referral code lookups
CREATE INDEX IF NOT EXISTS idx_partners_referral_code
ON partners(referral_code);

-- Index for partner email lookups
CREATE INDEX IF NOT EXISTS idx_partners_email
ON partners(email);

-- =====================================================
-- AGENT SYSTEM INDEXES
-- =====================================================

-- Index for agent outputs by call
CREATE INDEX IF NOT EXISTS idx_agent_outputs_call
ON agent_outputs(call_id);

-- Index for agent execution logs
CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_call
ON agent_execution_logs(call_id);

-- Index for agent performance metrics
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_org_date
ON agent_performance_metrics(organization_id, metric_date DESC);

-- =====================================================
-- PERFORMANCE METRICS INDEXES
-- =====================================================

-- Index for performance metrics queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_operation
ON performance_metrics(metric_type, operation, timestamp DESC);

-- Index for organization's performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_org
ON performance_metrics(organization_id, timestamp DESC)
WHERE organization_id IS NOT NULL;

-- =====================================================
-- NOTIFICATIONS TABLE INDEXES
-- =====================================================

-- Index for user's notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, is_read, created_at DESC);

-- =====================================================
-- FUNCTION TO ANALYZE INDEX USAGE
-- =====================================================

CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
  schemaname text,
  tablename text,
  indexname text,
  index_size text,
  idx_scan bigint,
  idx_tup_read bigint,
  idx_tup_fetch bigint,
  is_unique boolean,
  is_primary boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.schemaname::text,
    s.tablename::text,
    s.indexname::text,
    pg_size_pretty(pg_relation_size(s.indexrelid))::text as index_size,
    s.idx_scan,
    s.idx_tup_read,
    s.idx_tup_fetch,
    i.indisunique as is_unique,
    i.indisprimary as is_primary
  FROM pg_stat_user_indexes s
  JOIN pg_index i ON s.indexrelid = i.indexrelid
  WHERE s.schemaname = 'public'
  ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION TO IDENTIFY MISSING INDEXES
-- =====================================================

CREATE OR REPLACE FUNCTION suggest_missing_indexes()
RETURNS TABLE(
  tablename text,
  attname text,
  n_distinct real,
  correlation real,
  null_frac real,
  avg_width integer,
  recommendation text
) AS $$
BEGIN
  RETURN QUERY
  WITH table_stats AS (
    SELECT
      schemaname,
      tablename,
      attname,
      n_distinct,
      correlation,
      null_frac,
      avg_width
    FROM pg_stats
    WHERE schemaname = 'public'
      AND n_distinct > 100
      AND null_frac < 0.5
  ),
  existing_indexes AS (
    SELECT
      schemaname,
      tablename,
      string_agg(a.attname, ', ' ORDER BY array_position(i.indkey, a.attnum)) as indexed_columns
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
    WHERE n.nspname = 'public'
    GROUP BY schemaname, c.relname
  )
  SELECT
    ts.tablename::text,
    ts.attname::text,
    ts.n_distinct,
    ts.correlation,
    ts.null_frac,
    ts.avg_width,
    CASE
      WHEN abs(ts.correlation) > 0.9 THEN 'Consider B-tree index (high correlation)'
      WHEN ts.n_distinct > 1000 THEN 'Consider B-tree index (high cardinality)'
      WHEN ts.n_distinct BETWEEN 10 AND 1000 THEN 'Consider hash index (medium cardinality)'
      ELSE 'May not benefit from index'
    END as recommendation
  FROM table_stats ts
  LEFT JOIN existing_indexes ei ON ts.tablename = ei.tablename
    AND position(ts.attname in ei.indexed_columns) > 0
  WHERE ei.indexed_columns IS NULL
    AND ts.tablename IN ('calls', 'carriers', 'loads', 'transcripts', 'organizations')
  ORDER BY ts.tablename, ts.n_distinct DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ANALYZE TABLES TO UPDATE STATISTICS
-- =====================================================

ANALYZE calls;
ANALYZE carriers;
ANALYZE loads;
ANALYZE transcripts;
ANALYZE call_fields;
ANALYZE extraction_mappings;
ANALYZE organizations;
ANALYZE profiles;
ANALYZE user_organizations;
ANALYZE usage_metrics;
ANALYZE processing_locks;
ANALYZE carrier_interactions;
ANALYZE lanes;
ANALYZE audit_logs;
ANALYZE rate_confirmations;
ANALYZE agent_outputs;
ANALYZE agent_execution_logs;
ANALYZE agent_performance_metrics;
ANALYZE performance_metrics;
ANALYZE notifications;
ANALYZE team_invitations;
ANALYZE referrals;
ANALYZE partners;
ANALYZE twilio_calls;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION analyze_index_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION suggest_missing_indexes() TO authenticated;