-- =====================================================
-- PHASE 1: Add ONLY Missing Tables to LoadVoice
-- Date: 2026-01-13
-- Description: Adds only the tables that don't already exist
-- =====================================================

-- =====================================================
-- 1. USERS TABLE (Critical - Missing)
-- The profiles table exists but we need a proper users table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_auth_user FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- 2. TWILIO WEBHOOKS CONFIGURATION (Security Critical)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.twilio_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  webhook_type TEXT NOT NULL CHECK (webhook_type IN ('voice', 'status', 'recording', 'transcription')),
  url TEXT NOT NULL,
  method TEXT DEFAULT 'POST' CHECK (method IN ('GET', 'POST')),
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 3. CALL TRANSCRIPTIONS (Separate from transcripts)
-- This is for AssemblyAI transcriptions specifically
-- =====================================================

CREATE TABLE IF NOT EXISTS public.call_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  transcription_text TEXT,
  transcription_provider TEXT DEFAULT 'assemblyai' CHECK (transcription_provider IN ('assemblyai', 'twilio', 'manual')),
  provider_transcript_id TEXT,
  confidence_score DECIMAL(3, 2),
  word_timings JSONB,
  speakers JSONB,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 4. EXTRACTED FREIGHT DATA (Core Feature)
-- This is the main table for AI-extracted load information
-- =====================================================

CREATE TABLE IF NOT EXISTS public.extracted_freight_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Load Information
  load_number TEXT,
  pickup_location TEXT,
  pickup_city TEXT,
  pickup_state TEXT,
  pickup_zip TEXT,
  pickup_date DATE,
  pickup_time TIME,

  delivery_location TEXT,
  delivery_city TEXT,
  delivery_state TEXT,
  delivery_zip TEXT,
  delivery_date DATE,
  delivery_time TIME,

  -- Commodity Details
  commodity TEXT,
  weight_pounds INTEGER,
  pallet_count INTEGER,
  equipment_type TEXT,
  special_requirements TEXT[],

  -- Financial
  rate_amount DECIMAL(10, 2),
  rate_currency TEXT DEFAULT 'USD',
  payment_terms TEXT,
  detention_rate DECIMAL(10, 2),
  layover_rate DECIMAL(10, 2),
  fuel_surcharge DECIMAL(10, 2),

  -- Carrier Information
  carrier_name TEXT,
  carrier_mc_number TEXT,
  carrier_dot_number TEXT,
  carrier_contact_name TEXT,
  carrier_phone TEXT,
  carrier_email TEXT,
  driver_name TEXT,
  driver_phone TEXT,

  -- Shipper Information
  shipper_name TEXT,
  shipper_contact TEXT,
  shipper_phone TEXT,
  shipper_email TEXT,

  -- AI Processing
  extraction_confidence DECIMAL(3, 2),
  extracted_by TEXT DEFAULT 'openai' CHECK (extracted_by IN ('openai', 'manual', 'hybrid')),
  extraction_model TEXT,
  extraction_timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- User Corrections
  has_corrections BOOLEAN DEFAULT FALSE,
  corrected_by UUID REFERENCES public.users(id),
  corrected_at TIMESTAMPTZ,
  correction_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 5. USAGE LIMITS (Critical for billing)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Monthly Limits based on plan
  monthly_call_minutes INTEGER DEFAULT 60,
  monthly_transcription_minutes INTEGER DEFAULT 60,
  monthly_extractions INTEGER DEFAULT 100,
  monthly_storage_gb DECIMAL(10, 2) DEFAULT 1.0,

  -- Current Usage (reset monthly)
  current_call_minutes INTEGER DEFAULT 0,
  current_transcription_minutes INTEGER DEFAULT 0,
  current_extractions INTEGER DEFAULT 0,
  current_storage_gb DECIMAL(10, 2) DEFAULT 0,

  -- Overage Settings
  overage_enabled BOOLEAN DEFAULT FALSE,
  overage_rate_per_minute DECIMAL(10, 4) DEFAULT 0.20,

  reset_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. SYSTEM SETTINGS (Per organization configuration)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Recording Settings
  recording_enabled BOOLEAN DEFAULT TRUE,
  recording_disclosure_enabled BOOLEAN DEFAULT TRUE,
  recording_disclosure_text TEXT DEFAULT 'This call is being recorded for quality and documentation purposes.',
  always_announce_recording BOOLEAN DEFAULT FALSE,
  never_announce_recording BOOLEAN DEFAULT FALSE,

  -- AI Settings
  auto_transcription BOOLEAN DEFAULT TRUE,
  auto_extraction BOOLEAN DEFAULT TRUE,
  extraction_review_required BOOLEAN DEFAULT FALSE,

  -- Notification Settings
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  webhook_notifications BOOLEAN DEFAULT FALSE,
  notification_webhook_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 7. ADD MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add missing columns to calls table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'twilio_call_sid') THEN
    ALTER TABLE public.calls ADD COLUMN twilio_call_sid TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'twilio_phone_number_id') THEN
    ALTER TABLE public.calls ADD COLUMN twilio_phone_number_id UUID REFERENCES public.twilio_phone_numbers(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'direction') THEN
    ALTER TABLE public.calls ADD COLUMN direction TEXT CHECK (direction IN ('inbound', 'outbound'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'from_number') THEN
    ALTER TABLE public.calls ADD COLUMN from_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'to_number') THEN
    ALTER TABLE public.calls ADD COLUMN to_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'extraction_status') THEN
    ALTER TABLE public.calls ADD COLUMN extraction_status TEXT DEFAULT 'pending'
      CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed', 'none'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'transcription_status') THEN
    ALTER TABLE public.calls ADD COLUMN transcription_status TEXT DEFAULT 'pending'
      CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed', 'none'));
  END IF;
END $$;

-- Add missing columns to twilio_phone_numbers table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'twilio_phone_numbers' AND column_name = 'twilio_sid') THEN
    ALTER TABLE public.twilio_phone_numbers ADD COLUMN twilio_sid TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'twilio_phone_numbers' AND column_name = 'forwarding_number') THEN
    ALTER TABLE public.twilio_phone_numbers ADD COLUMN forwarding_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'twilio_phone_numbers' AND column_name = 'forwarding_type') THEN
    ALTER TABLE public.twilio_phone_numbers ADD COLUMN forwarding_type TEXT
      CHECK (forwarding_type IN ('unconditional', 'busy', 'no-answer'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'twilio_phone_numbers' AND column_name = 'capabilities') THEN
    ALTER TABLE public.twilio_phone_numbers ADD COLUMN capabilities JSONB DEFAULT '{"voice": true, "sms": false, "mms": false}';
  END IF;
END $$;

-- Add missing columns to loads table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loads' AND column_name = 'extracted_data_id') THEN
    ALTER TABLE public.loads ADD COLUMN extracted_data_id UUID REFERENCES public.extracted_freight_data(id);
  END IF;
END $$;

-- =====================================================
-- 8. INDEXES FOR NEW TABLES
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Twilio webhooks indexes
CREATE INDEX IF NOT EXISTS idx_twilio_webhooks_org ON public.twilio_webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_twilio_webhooks_type ON public.twilio_webhooks(webhook_type);

-- Call transcriptions indexes
CREATE INDEX IF NOT EXISTS idx_call_transcriptions_call ON public.call_transcriptions(call_id);

-- Extracted freight data indexes
CREATE INDEX IF NOT EXISTS idx_extracted_org ON public.extracted_freight_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_extracted_call ON public.extracted_freight_data(call_id);
CREATE INDEX IF NOT EXISTS idx_extracted_carrier_mc ON public.extracted_freight_data(carrier_mc_number);
CREATE INDEX IF NOT EXISTS idx_extracted_created ON public.extracted_freight_data(created_at DESC);

-- Usage limits index
CREATE INDEX IF NOT EXISTS idx_usage_limits_org ON public.usage_limits(organization_id);

-- System settings index
CREATE INDEX IF NOT EXISTS idx_system_settings_org ON public.system_settings(organization_id);

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_freight_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Users can see their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Organization members can access twilio webhooks
CREATE POLICY "Members can manage webhooks" ON public.twilio_webhooks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations
      WHERE organization_id = twilio_webhooks.organization_id
      AND user_id = auth.uid()
    )
  );

-- Organization members can access call transcriptions
CREATE POLICY "Members can access transcriptions" ON public.call_transcriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.calls c
      JOIN public.user_organizations uo ON uo.organization_id = c.organization_id
      WHERE c.id = call_transcriptions.call_id
      AND uo.user_id = auth.uid()
    )
  );

-- Organization members can access extracted data
CREATE POLICY "Members can access extracted data" ON public.extracted_freight_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations
      WHERE organization_id = extracted_freight_data.organization_id
      AND user_id = auth.uid()
    )
  );

-- Organization members can view usage limits
CREATE POLICY "Members can view usage limits" ON public.usage_limits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations
      WHERE organization_id = usage_limits.organization_id
      AND user_id = auth.uid()
    )
  );

-- Organization admins can update usage limits
CREATE POLICY "Admins can update usage limits" ON public.usage_limits
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations
      WHERE organization_id = usage_limits.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Organization members can view settings
CREATE POLICY "Members can view settings" ON public.system_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations
      WHERE organization_id = system_settings.organization_id
      AND user_id = auth.uid()
    )
  );

-- Organization admins can update settings
CREATE POLICY "Admins can update settings" ON public.system_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_organizations
      WHERE organization_id = system_settings.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 10. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to new tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_call_transcriptions_updated_at BEFORE UPDATE ON public.call_transcriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_extracted_freight_updated_at BEFORE UPDATE ON public.extracted_freight_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_usage_limits_updated_at BEFORE UPDATE ON public.usage_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 11. FUNCTION TO RESET MONTHLY USAGE
-- =====================================================

CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.usage_limits
  SET
    current_call_minutes = 0,
    current_transcription_minutes = 0,
    current_extractions = 0,
    current_storage_gb = 0,
    reset_date = CURRENT_DATE
  WHERE DATE_TRUNC('month', reset_date) < DATE_TRUNC('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. INSERT DEFAULT SETTINGS FOR EXISTING ORGS
-- =====================================================

-- Create default system settings for organizations that don't have them
INSERT INTO public.system_settings (organization_id)
SELECT id FROM public.organizations
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_settings WHERE organization_id = organizations.id
);

-- Create default usage limits for organizations that don't have them
INSERT INTO public.usage_limits (organization_id, reset_date)
SELECT id, CURRENT_DATE FROM public.organizations
WHERE NOT EXISTS (
  SELECT 1 FROM public.usage_limits WHERE organization_id = organizations.id
);

-- =====================================================
-- END OF CORRECTED PHASE 1 MIGRATION
-- =====================================================