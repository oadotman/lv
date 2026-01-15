-- =====================================================
-- SYSTEM ALERTS TABLE - FIXED VERSION V2
-- Tracks all system alerts and failures for monitoring
-- Fixed to work with Supabase Auth (no public.users table)
-- V2: Fixed duplicate user_id column in recent_failures view
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Alert classification
  alert_type TEXT NOT NULL, -- recording_failed, transcription_failed, etc.
  severity TEXT NOT NULL, -- low, medium, high, critical

  -- Alert content
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- References
  call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
  user_id UUID, -- References auth.users, no FK constraint
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,

  -- Error details
  error_details JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Tracking
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID, -- References auth.users, no FK constraint
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_system_alerts_call_id ON public.system_alerts(call_id);
CREATE INDEX idx_system_alerts_user_id ON public.system_alerts(user_id);
CREATE INDEX idx_system_alerts_organization_id ON public.system_alerts(organization_id);
CREATE INDEX idx_system_alerts_alert_type ON public.system_alerts(alert_type);
CREATE INDEX idx_system_alerts_severity ON public.system_alerts(severity);
CREATE INDEX idx_system_alerts_created_at ON public.system_alerts(created_at DESC);
CREATE INDEX idx_system_alerts_resolved ON public.system_alerts(resolved);

-- Row Level Security
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can view system alerts
CREATE POLICY "Admins can view all alerts" ON public.system_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Users can view alerts for their own calls
CREATE POLICY "Users can view their call alerts" ON public.system_alerts
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    call_id IN (
      SELECT id FROM public.calls
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- ALERT SUMMARY VIEW
-- =====================================================

CREATE OR REPLACE VIEW public.alert_summary AS
SELECT
  DATE(created_at) as alert_date,
  alert_type,
  severity,
  COUNT(*) as alert_count,
  COUNT(DISTINCT user_id) as affected_users,
  COUNT(DISTINCT call_id) as affected_calls,
  COUNT(DISTINCT organization_id) as affected_orgs,
  SUM(CASE WHEN resolved THEN 1 ELSE 0 END) as resolved_count,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::DECIMAL(10,2) as avg_resolution_hours
FROM public.system_alerts
GROUP BY DATE(created_at), alert_type, severity
ORDER BY alert_date DESC, severity DESC, alert_count DESC;

-- =====================================================
-- RECENT FAILURES VIEW
-- =====================================================

CREATE OR REPLACE VIEW public.recent_failures AS
SELECT
  sa.*,
  c.customer_name,
  c.duration,
  c.status as call_status,
  -- Removed uo.user_id since sa.* already includes user_id
  uo.user_id as owner_user_id,  -- Renamed to avoid duplicate
  o.name as organization_name
FROM public.system_alerts sa
LEFT JOIN public.calls c ON sa.call_id = c.id
LEFT JOIN public.organizations o ON sa.organization_id = o.id
LEFT JOIN public.user_organizations uo ON uo.organization_id = o.id AND uo.role = 'owner'
WHERE sa.created_at > NOW() - INTERVAL '24 hours'
  AND sa.resolved = false
  AND sa.severity IN ('high', 'critical')
ORDER BY sa.created_at DESC;

-- Grant permissions
GRANT SELECT ON public.alert_summary TO authenticated;
GRANT SELECT ON public.recent_failures TO authenticated;