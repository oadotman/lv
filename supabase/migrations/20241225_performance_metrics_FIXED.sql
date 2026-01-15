-- =====================================================
-- PERFORMANCE METRICS TABLE - FIXED VERSION
-- Stores performance data for monitoring and optimization
-- Fixed to use user_organizations instead of organization_members
-- =====================================================

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('extraction', 'api_call', 'page_load', 'database_query')),
  operation TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX idx_performance_metrics_operation ON performance_metrics(operation);
CREATE INDEX idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_organization_id ON performance_metrics(organization_id);
CREATE INDEX idx_performance_metrics_success ON performance_metrics(success);

-- Index for slow operations
CREATE INDEX idx_performance_metrics_slow ON performance_metrics(duration_ms)
  WHERE duration_ms > 5000;

-- Enable RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own metrics
CREATE POLICY "Users can view own metrics"
  ON performance_metrics
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    organization_id IN (
      SELECT organization_id
      FROM user_organizations  -- FIXED: Changed from organization_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: System can insert metrics
CREATE POLICY "Authenticated users can insert metrics"
  ON performance_metrics
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Function to clean up old metrics (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM performance_metrics
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up old metrics (if pg_cron is available)
-- This would run daily at 2 AM
-- SELECT cron.schedule('cleanup-performance-metrics', '0 2 * * *', 'SELECT cleanup_old_performance_metrics();');

-- View for performance summary by hour
CREATE OR REPLACE VIEW performance_hourly_summary AS
SELECT
  date_trunc('hour', timestamp) as hour,
  metric_type,
  COUNT(*) as total_operations,
  COUNT(*) FILTER (WHERE success = true) as successful_operations,
  AVG(duration_ms)::INTEGER as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  MIN(duration_ms) as min_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms)::INTEGER as median_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::INTEGER as p95_duration_ms
FROM performance_metrics
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY date_trunc('hour', timestamp), metric_type
ORDER BY hour DESC, metric_type;

-- View for slow operations
CREATE OR REPLACE VIEW slow_operations AS
SELECT
  id,
  metric_type,
  operation,
  duration_ms,
  success,
  error_message,
  timestamp,
  user_id,
  organization_id
FROM performance_metrics
WHERE duration_ms > CASE
  WHEN metric_type = 'extraction' THEN 60000
  WHEN metric_type = 'api_call' THEN 5000
  WHEN metric_type = 'page_load' THEN 3000
  WHEN metric_type = 'database_query' THEN 1000
  ELSE 5000
END
ORDER BY timestamp DESC
LIMIT 100;

-- View for success rate by operation
CREATE OR REPLACE VIEW operation_success_rates AS
SELECT
  operation,
  metric_type,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE success = true) as successful_attempts,
  (COUNT(*) FILTER (WHERE success = true)::NUMERIC / COUNT(*)::NUMERIC * 100)::NUMERIC(5,2) as success_rate,
  AVG(duration_ms)::INTEGER as avg_duration_ms
FROM performance_metrics
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY operation, metric_type
HAVING COUNT(*) >= 10
ORDER BY success_rate ASC, total_attempts DESC;

-- Grant permissions to authenticated users
GRANT SELECT ON performance_hourly_summary TO authenticated;
GRANT SELECT ON slow_operations TO authenticated;
GRANT SELECT ON operation_success_rates TO authenticated;

-- Add comment
COMMENT ON TABLE performance_metrics IS 'Stores performance metrics for monitoring application performance and identifying bottlenecks';