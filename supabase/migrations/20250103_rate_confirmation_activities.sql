-- Create rate_confirmation_activities table for tracking all actions
CREATE TABLE IF NOT EXISTS rate_confirmation_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_confirmation_id UUID NOT NULL REFERENCES rate_confirmations(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'generated',
    'email_sent',
    'viewed',
    'downloaded',
    'signed',
    'accepted',
    'rejected',
    'resent',
    'updated'
  )),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_rate_confirmation_activities_rc_id
ON rate_confirmation_activities(rate_confirmation_id);

CREATE INDEX idx_rate_confirmation_activities_type
ON rate_confirmation_activities(activity_type);

CREATE INDEX idx_rate_confirmation_activities_created_at
ON rate_confirmation_activities(created_at DESC);

-- Add RLS policies
ALTER TABLE rate_confirmation_activities ENABLE ROW LEVEL SECURITY;

-- Allow organization members to view their rate confirmation activities
CREATE POLICY "Organization members can view their rate confirmation activities"
ON rate_confirmation_activities
FOR SELECT
TO authenticated
USING (
  rate_confirmation_id IN (
    SELECT rc.id
    FROM rate_confirmations rc
    WHERE rc.organization_id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = auth.uid()
    )
  )
);

-- Allow organization members to create activities for their rate confirmations
CREATE POLICY "Organization members can create activities"
ON rate_confirmation_activities
FOR INSERT
TO authenticated
WITH CHECK (
  rate_confirmation_id IN (
    SELECT rc.id
    FROM rate_confirmations rc
    WHERE rc.organization_id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = auth.uid()
    )
  )
);

-- Add sent_to and sent_at columns to rate_confirmations if not exists
ALTER TABLE rate_confirmations
ADD COLUMN IF NOT EXISTS sent_to TEXT[],
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signed_by TEXT,
ADD COLUMN IF NOT EXISTS signature_data JSONB,
ADD COLUMN IF NOT EXISTS acceptance_status TEXT CHECK (acceptance_status IN ('pending', 'accepted', 'rejected')),
ADD COLUMN IF NOT EXISTS acceptance_notes TEXT;

-- Create tracking table for public views (no authentication required)
CREATE TABLE IF NOT EXISTS rate_confirmation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_confirmation_id UUID NOT NULL REFERENCES rate_confirmations(id) ON DELETE CASCADE,
  tracking_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  last_downloaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create index for tracking token lookups
CREATE INDEX idx_rate_confirmation_tracking_token
ON rate_confirmation_tracking(tracking_token);

-- Allow public to view tracking data (for external carriers)
ALTER TABLE rate_confirmation_tracking ENABLE ROW LEVEL SECURITY;

-- Public can view tracking by token
CREATE POLICY "Public can view tracking by token"
ON rate_confirmation_tracking
FOR SELECT
TO public
USING (true);

-- Only authenticated org members can create tracking
CREATE POLICY "Organization members can create tracking"
ON rate_confirmation_tracking
FOR INSERT
TO authenticated
WITH CHECK (
  rate_confirmation_id IN (
    SELECT rc.id
    FROM rate_confirmations rc
    WHERE rc.organization_id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = auth.uid()
    )
  )
);

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_rate_confirmation_views(
  p_tracking_token TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tracking RECORD;
  v_rate_confirmation RECORD;
BEGIN
  -- Find tracking record
  SELECT * INTO v_tracking
  FROM rate_confirmation_tracking
  WHERE tracking_token = p_tracking_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid tracking token');
  END IF;

  -- Update tracking view count
  UPDATE rate_confirmation_tracking
  SET
    view_count = view_count + 1,
    last_viewed_at = CURRENT_TIMESTAMP
  WHERE tracking_token = p_tracking_token;

  -- Update rate confirmation view count
  UPDATE rate_confirmations
  SET
    view_count = view_count + 1,
    last_viewed_at = CURRENT_TIMESTAMP
  WHERE id = v_tracking.rate_confirmation_id;

  -- Log activity
  INSERT INTO rate_confirmation_activities (
    rate_confirmation_id,
    activity_type,
    details,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    v_tracking.rate_confirmation_id,
    'viewed',
    jsonb_build_object('tracking_token', p_tracking_token),
    p_ip_address,
    p_user_agent,
    CURRENT_TIMESTAMP
  );

  -- Return success with current counts
  SELECT * INTO v_rate_confirmation
  FROM rate_confirmations
  WHERE id = v_tracking.rate_confirmation_id;

  RETURN jsonb_build_object(
    'success', true,
    'view_count', v_rate_confirmation.view_count,
    'last_viewed_at', v_rate_confirmation.last_viewed_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment download count
CREATE OR REPLACE FUNCTION increment_rate_confirmation_downloads(
  p_tracking_token TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tracking RECORD;
  v_rate_confirmation RECORD;
BEGIN
  -- Find tracking record
  SELECT * INTO v_tracking
  FROM rate_confirmation_tracking
  WHERE tracking_token = p_tracking_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid tracking token');
  END IF;

  -- Update tracking download count
  UPDATE rate_confirmation_tracking
  SET
    download_count = download_count + 1,
    last_downloaded_at = CURRENT_TIMESTAMP
  WHERE tracking_token = p_tracking_token;

  -- Update rate confirmation download count
  UPDATE rate_confirmations
  SET
    download_count = download_count + 1
  WHERE id = v_tracking.rate_confirmation_id;

  -- Log activity
  INSERT INTO rate_confirmation_activities (
    rate_confirmation_id,
    activity_type,
    details,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    v_tracking.rate_confirmation_id,
    'downloaded',
    jsonb_build_object('tracking_token', p_tracking_token),
    p_ip_address,
    p_user_agent,
    CURRENT_TIMESTAMP
  );

  -- Return success with current counts
  SELECT * INTO v_rate_confirmation
  FROM rate_confirmations
  WHERE id = v_tracking.rate_confirmation_id;

  RETURN jsonb_build_object(
    'success', true,
    'download_count', v_rate_confirmation.download_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;