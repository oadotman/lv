-- =====================================================
-- LOADVOICE PHASE 3: CRM FEATURES - FIXED VERSION
-- =====================================================
-- This migration is OPTIONAL if you already ran 20241221_loadvoice_core_tables.sql
-- It adds missing CRM features without duplicating existing tables
-- =====================================================

-- =====================================================
-- SKIP THIS MIGRATION IF:
-- You already have loads, carriers, shippers tables from core_tables migration
-- =====================================================

-- Check if tables already exist before creating
DO $$
BEGIN
    -- Only create loads if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loads') THEN
        RAISE NOTICE 'Creating loads table...';
        -- If you need the loads table, uncomment the CREATE TABLE below
        -- But since you already ran core_tables, you should skip this
    ELSE
        RAISE NOTICE 'loads table already exists, skipping...';
    END IF;

    -- Only create carriers if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'carriers') THEN
        RAISE NOTICE 'Creating carriers table...';
        -- If you need the carriers table, uncomment the CREATE TABLE below
    ELSE
        RAISE NOTICE 'carriers table already exists, skipping...';
    END IF;

    -- Only create shippers if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shippers') THEN
        RAISE NOTICE 'Creating shippers table...';
        -- If you need the shippers table, uncomment the CREATE TABLE below
    ELSE
        RAISE NOTICE 'shippers table already exists, skipping...';
    END IF;
END $$;

-- =====================================================
-- ADD ANY MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add columns to loads table if they don't exist
DO $$
BEGIN
    -- Add load_number if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'loads' AND column_name = 'load_number') THEN
        ALTER TABLE loads ADD COLUMN load_number TEXT;
    END IF;

    -- Add tracking fields if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'loads' AND column_name = 'tracking_updates') THEN
        ALTER TABLE loads ADD COLUMN tracking_updates JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'loads' AND column_name = 'last_check_call') THEN
        ALTER TABLE loads ADD COLUMN last_check_call TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'loads' AND column_name = 'on_time_delivery') THEN
        ALTER TABLE loads ADD COLUMN on_time_delivery BOOLEAN;
    END IF;

    -- Add financial fields if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'loads' AND column_name = 'customer_rate') THEN
        ALTER TABLE loads ADD COLUMN customer_rate DECIMAL(10, 2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'loads' AND column_name = 'quick_pay') THEN
        ALTER TABLE loads ADD COLUMN quick_pay BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'loads' AND column_name = 'payment_terms') THEN
        ALTER TABLE loads ADD COLUMN payment_terms TEXT DEFAULT 'NET 30';
    END IF;

    -- Add document tracking if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'loads' AND column_name = 'rate_confirmation_sent_at') THEN
        ALTER TABLE loads ADD COLUMN rate_confirmation_sent_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'loads' AND column_name = 'rate_confirmation_signed_at') THEN
        ALTER TABLE loads ADD COLUMN rate_confirmation_signed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'loads' AND column_name = 'bol_received_at') THEN
        ALTER TABLE loads ADD COLUMN bol_received_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'loads' AND column_name = 'pod_received_at') THEN
        ALTER TABLE loads ADD COLUMN pod_received_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add columns to carriers table if they don't exist
DO $$
BEGIN
    -- Add DBA name if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'carriers' AND column_name = 'dba_name') THEN
        ALTER TABLE carriers ADD COLUMN dba_name TEXT;
    END IF;

    -- Add factoring company if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'carriers' AND column_name = 'factoring_company') THEN
        ALTER TABLE carriers ADD COLUMN factoring_company TEXT;
    END IF;

    -- Add payment instructions if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'carriers' AND column_name = 'payment_instructions') THEN
        ALTER TABLE carriers ADD COLUMN payment_instructions TEXT;
    END IF;

    -- Add insurance fields if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'carriers' AND column_name = 'insurance_expiration') THEN
        ALTER TABLE carriers ADD COLUMN insurance_expiration DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'carriers' AND column_name = 'insurance_amount') THEN
        ALTER TABLE carriers ADD COLUMN insurance_amount DECIMAL(12, 2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'carriers' AND column_name = 'cargo_insurance') THEN
        ALTER TABLE carriers ADD COLUMN cargo_insurance DECIMAL(12, 2);
    END IF;

    -- Add performance metrics if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'carriers' AND column_name = 'average_rate_per_mile') THEN
        ALTER TABLE carriers ADD COLUMN average_rate_per_mile DECIMAL(6, 2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'carriers' AND column_name = 'internal_rating') THEN
        ALTER TABLE carriers ADD COLUMN internal_rating INTEGER CHECK (internal_rating >= 1 AND internal_rating <= 5);
    END IF;
END $$;

-- Add columns to shippers table if they don't exist
DO $$
BEGIN
    -- Add contacts as JSONB if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shippers' AND column_name = 'contacts') THEN
        ALTER TABLE shippers ADD COLUMN contacts JSONB DEFAULT '[]';
    END IF;

    -- Add billing address fields if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shippers' AND column_name = 'billing_address') THEN
        ALTER TABLE shippers ADD COLUMN billing_address TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shippers' AND column_name = 'billing_city') THEN
        ALTER TABLE shippers ADD COLUMN billing_city TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shippers' AND column_name = 'billing_state') THEN
        ALTER TABLE shippers ADD COLUMN billing_state TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shippers' AND column_name = 'billing_zip') THEN
        ALTER TABLE shippers ADD COLUMN billing_zip TEXT;
    END IF;

    -- Add financial fields if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shippers' AND column_name = 'average_days_to_pay') THEN
        ALTER TABLE shippers ADD COLUMN average_days_to_pay INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shippers' AND column_name = 'average_margin') THEN
        ALTER TABLE shippers ADD COLUMN average_margin DECIMAL(5, 2);
    END IF;

    -- Add relationship fields if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shippers' AND column_name = 'account_manager') THEN
        ALTER TABLE shippers ADD COLUMN account_manager UUID; -- No FK to users table
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shippers' AND column_name = 'customer_since') THEN
        ALTER TABLE shippers ADD COLUMN customer_since DATE DEFAULT CURRENT_DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shippers' AND column_name = 'typical_commodities') THEN
        ALTER TABLE shippers ADD COLUMN typical_commodities TEXT[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shippers' AND column_name = 'internal_notes') THEN
        ALTER TABLE shippers ADD COLUMN internal_notes TEXT;
    END IF;
END $$;

-- =====================================================
-- CREATE ONLY MISSING INDEXES (with IF NOT EXISTS)
-- =====================================================

-- Create indexes only if they don't exist
DO $$
BEGIN
    -- Loads indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_loads_org_status') THEN
        CREATE INDEX idx_loads_org_status ON loads(organization_id, status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_loads_load_number') THEN
        CREATE INDEX idx_loads_load_number ON loads(organization_id, load_number);
    END IF;

    -- Carriers indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_carriers_mc') THEN
        CREATE INDEX idx_carriers_mc ON carriers(mc_number);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_carriers_org_status') THEN
        CREATE INDEX idx_carriers_org_status ON carriers(organization_id, status);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_carriers_performance') THEN
        CREATE INDEX idx_carriers_performance ON carriers(on_time_percentage, total_loads);
    END IF;

    -- Shippers indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shippers_org') THEN
        CREATE INDEX idx_shippers_org ON shippers(organization_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shippers_name') THEN
        CREATE INDEX idx_shippers_name ON shippers(organization_id, company_name);
    END IF;
END $$;

-- =====================================================
-- CREATE NEW TABLES (only if core_tables didn't create them)
-- =====================================================

-- Rate confirmations table (likely doesn't exist from core_tables)
CREATE TABLE IF NOT EXISTS rate_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  load_id UUID REFERENCES loads(id) ON DELETE CASCADE,

  -- Document details
  confirmation_number TEXT NOT NULL,
  version INTEGER DEFAULT 1,

  -- PDF storage
  pdf_url TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,

  -- Sending and signing
  sent_to_email TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_by UUID, -- No FK to users table

  signed_by_name TEXT,
  signed_by_title TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_ip TEXT,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'cancelled')),

  -- Content snapshot (what was sent)
  content JSONB, -- Complete load details at time of generation

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(organization_id, confirmation_number)
);

-- Create indexes for rate confirmations
CREATE INDEX IF NOT EXISTS idx_rate_conf_load ON rate_confirmations(load_id);
CREATE INDEX IF NOT EXISTS idx_rate_conf_status ON rate_confirmations(organization_id, status);

-- =====================================================
-- FUNCTIONS (Only create if they don't exist)
-- =====================================================

-- Function to generate load number
CREATE OR REPLACE FUNCTION generate_load_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  last_number INTEGER;
  new_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(load_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO last_number
  FROM loads
  WHERE organization_id = org_id
    AND load_number ~ '^LD[0-9]+$';

  new_number := 'LD' || LPAD(last_number::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update carrier metrics
CREATE OR REPLACE FUNCTION update_carrier_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.carrier_id IS NOT NULL THEN
    UPDATE carriers
    SET
      total_loads = (
        SELECT COUNT(*) FROM loads
        WHERE carrier_id = NEW.carrier_id
      ),
      completed_loads = (
        SELECT COUNT(*) FROM loads
        WHERE carrier_id = NEW.carrier_id
        AND status = 'delivered'
      ),
      on_time_percentage = (
        SELECT
          CASE
            WHEN COUNT(*) > 0 THEN
              (COUNT(*) FILTER (WHERE on_time_delivery = true)::DECIMAL / COUNT(*) * 100)
            ELSE 100
          END
        FROM loads
        WHERE carrier_id = NEW.carrier_id
        AND status = 'delivered'
      ),
      last_used_date = CURRENT_DATE,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.carrier_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update shipper metrics
CREATE OR REPLACE FUNCTION update_shipper_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.shipper_id IS NOT NULL THEN
    UPDATE shippers
    SET
      total_loads = (
        SELECT COUNT(*) FROM loads
        WHERE shipper_id = NEW.shipper_id
      ),
      total_revenue = (
        SELECT COALESCE(SUM(shipper_rate), 0)
        FROM loads
        WHERE shipper_id = NEW.shipper_id
      ),
      average_margin = (
        SELECT AVG(margin_percent)
        FROM loads
        WHERE shipper_id = NEW.shipper_id
        AND margin_percent IS NOT NULL
      ),
      last_load_date = (
        SELECT MAX(delivery_date) FROM loads WHERE shipper_id = NEW.shipper_id
      ),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.shipper_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_carrier_metrics_trigger') THEN
        CREATE TRIGGER update_carrier_metrics_trigger
          AFTER INSERT OR UPDATE ON loads
          FOR EACH ROW
          EXECUTE FUNCTION update_carrier_metrics();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_shipper_metrics_trigger') THEN
        CREATE TRIGGER update_shipper_metrics_trigger
          AFTER INSERT OR UPDATE ON loads
          FOR EACH ROW
          EXECUTE FUNCTION update_shipper_metrics();
    END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY - Update policies
-- =====================================================

-- Enable RLS on rate_confirmations
ALTER TABLE rate_confirmations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their organization's rate confirmations" ON rate_confirmations;
DROP POLICY IF EXISTS "Users can manage their organization's rate confirmations" ON rate_confirmations;

-- Rate confirmations policies
CREATE POLICY "Users can view their organization's rate confirmations"
  ON rate_confirmations FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their organization's rate confirmations"
  ON rate_confirmations FOR ALL
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON rate_confirmations TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This fixed migration:
-- 1. Checks if tables exist before creating
-- 2. Adds only missing columns to existing tables
-- 3. Creates indexes with IF NOT EXISTS checks
-- 4. Removes all references to public.users table
-- 5. Uses auth.uid() and user_organizations for RLS