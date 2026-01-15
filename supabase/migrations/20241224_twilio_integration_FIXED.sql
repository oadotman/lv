-- =====================================================
-- TWILIO INTEGRATION TABLES - FIXED VERSION
-- Phone numbers, calls, recordings, click-to-call
-- =====================================================

-- Organization phone numbers (Twilio numbers)
CREATE TABLE IF NOT EXISTS public.organization_phones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Twilio phone details
  twilio_number TEXT NOT NULL UNIQUE,
  twilio_sid TEXT UNIQUE,
  friendly_name TEXT,
  capabilities JSONB DEFAULT '{"voice": true, "sms": false, "mms": false, "fax": false}'::jsonb,

  -- Forwarding configuration
  forward_to TEXT, -- Number to forward calls to
  recording_enabled BOOLEAN DEFAULT true,
  transcription_enabled BOOLEAN DEFAULT true,

  -- Status
  status TEXT DEFAULT 'active', -- active, inactive, pending, failed

  -- Metadata
  metadata JSONB DEFAULT '{}', -- region, locality, rate_center, lat/long
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Ensure one phone per org
  CONSTRAINT unique_org_twilio_sid UNIQUE(organization_id, twilio_sid)
);

-- Twilio calls tracking
CREATE TABLE IF NOT EXISTS public.twilio_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Twilio identifiers
  twilio_call_sid TEXT UNIQUE NOT NULL,
  twilio_recording_sid TEXT,

  -- Call details
  from_number TEXT,
  to_number TEXT,
  direction TEXT, -- inbound, outbound-api, outbound-dial
  status TEXT,
  duration INTEGER, -- seconds

  -- Recording details
  recording_url TEXT,
  recording_duration INTEGER, -- seconds

  -- Billing
  price DECIMAL(10,4),
  price_unit TEXT DEFAULT 'USD',

  -- Call metadata
  answered_by TEXT, -- human, machine, fax, unknown
  forwarded_from TEXT,
  caller_name TEXT,

  -- Raw webhook data for debugging
  raw_webhook_data JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Click-to-call sessions
CREATE TABLE IF NOT EXISTS public.click_to_call_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- References auth.users, no FK constraint
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Call details
  twilio_call_sid TEXT UNIQUE,
  from_number TEXT NOT NULL, -- User's Twilio number
  to_number TEXT NOT NULL, -- Number being called

  -- Optional associations
  contact_id UUID, -- Could be carrier, shipper, etc.
  contact_type TEXT, -- carrier, shipper, broker, other

  -- Status tracking
  status TEXT DEFAULT 'initiated', -- initiated, connecting, connected, completed, failed
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  connected_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- seconds

  -- User notes
  notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Twilio usage tracking (for billing)
CREATE TABLE IF NOT EXISTS public.twilio_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Period
  month TEXT NOT NULL, -- YYYY-MM format

  -- Usage metrics
  voice_minutes INTEGER DEFAULT 0,
  recording_minutes INTEGER DEFAULT 0,
  transcription_minutes INTEGER DEFAULT 0,
  sms_count INTEGER DEFAULT 0,
  phone_numbers_count INTEGER DEFAULT 0,

  -- Cost tracking
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Ensure one record per org per month
  CONSTRAINT unique_org_month UNIQUE(organization_id, month)
);

-- Indexes for performance
CREATE INDEX idx_organization_phones_org_id ON public.organization_phones(organization_id);
CREATE INDEX idx_organization_phones_status ON public.organization_phones(status);

CREATE INDEX idx_twilio_calls_org_id ON public.twilio_calls(organization_id);
CREATE INDEX idx_twilio_calls_call_sid ON public.twilio_calls(twilio_call_sid);
CREATE INDEX idx_twilio_calls_created_at ON public.twilio_calls(created_at DESC);

CREATE INDEX idx_click_to_call_sessions_user_id ON public.click_to_call_sessions(user_id);
CREATE INDEX idx_click_to_call_sessions_org_id ON public.click_to_call_sessions(organization_id);

CREATE INDEX idx_twilio_usage_org_month ON public.twilio_usage(organization_id, month);

-- Row Level Security
ALTER TABLE public.organization_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.click_to_call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_usage ENABLE ROW LEVEL SECURITY;

-- Organization phones policies
CREATE POLICY "Users can view their org phones" ON public.organization_phones
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage org phones" ON public.organization_phones
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Twilio calls policies
CREATE POLICY "Users can view their org calls" ON public.twilio_calls
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Click-to-call sessions policies
CREATE POLICY "Users can view their sessions" ON public.click_to_call_sessions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their sessions" ON public.click_to_call_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their sessions" ON public.click_to_call_sessions
  FOR UPDATE
  USING (user_id = auth.uid());

-- Twilio usage policies
CREATE POLICY "Users can view their org usage" ON public.twilio_usage
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Function to update Twilio usage
CREATE OR REPLACE FUNCTION update_twilio_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update usage metrics when a new Twilio call is recorded
  INSERT INTO twilio_usage (
    organization_id,
    month,
    voice_minutes,
    recording_minutes
  ) VALUES (
    NEW.organization_id,
    TO_CHAR(NEW.created_at, 'YYYY-MM'),
    COALESCE(NEW.duration / 60, 0),
    COALESCE(NEW.recording_duration / 60, 0)
  )
  ON CONFLICT (organization_id, month) DO UPDATE
  SET
    voice_minutes = twilio_usage.voice_minutes + EXCLUDED.voice_minutes,
    recording_minutes = twilio_usage.recording_minutes + EXCLUDED.recording_minutes,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for usage tracking
CREATE TRIGGER update_twilio_usage_trigger
  AFTER INSERT ON public.twilio_calls
  FOR EACH ROW
  EXECUTE FUNCTION update_twilio_usage();

-- Add Twilio-related columns to organizations table
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS twilio_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT,
  ADD COLUMN IF NOT EXISTS twilio_auth_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS twilio_settings JSONB DEFAULT '{}'::jsonb;