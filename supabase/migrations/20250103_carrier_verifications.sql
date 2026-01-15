-- Create carrier_verifications table for FMCSA SAFER data caching
CREATE TABLE IF NOT EXISTS carrier_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID REFERENCES carriers(id) ON DELETE CASCADE,
  mc_number TEXT,
  dot_number TEXT,

  -- FMCSA company data
  legal_name TEXT,
  dba_name TEXT,
  physical_address TEXT,
  physical_city TEXT,
  physical_state TEXT,
  physical_zip TEXT,
  phone TEXT,
  email TEXT,

  -- Operating status
  operating_status TEXT CHECK (operating_status IN (
    'AUTHORIZED',
    'NOT AUTHORIZED',
    'OUT OF SERVICE',
    'UNREGISTERED',
    'SUSPENDED'
  )),
  entity_type TEXT, -- CARRIER, BROKER, FREIGHT FORWARDER, etc.
  operation_classification TEXT, -- FOR HIRE, PRIVATE, etc.
  cargo_carried JSONB, -- Array of cargo types

  -- Authority dates
  authority_date DATE,
  common_authority_date DATE,
  contract_authority_date DATE,
  broker_authority_date DATE,

  -- Safety ratings
  safety_rating TEXT CHECK (safety_rating IN (
    'SATISFACTORY',
    'CONDITIONAL',
    'UNSATISFACTORY',
    'NOT RATED',
    'UNRATED'
  )),
  safety_rating_date DATE,
  safety_review_date DATE,
  out_of_service_date DATE,
  mcs150_date DATE,
  mcs150_mileage INTEGER,

  -- Insurance status
  bipd_insurance_on_file BOOLEAN DEFAULT FALSE,
  bipd_required NUMERIC(12, 2),
  bipd_on_file NUMERIC(12, 2),
  cargo_insurance_on_file BOOLEAN DEFAULT FALSE,
  cargo_required NUMERIC(12, 2),
  cargo_on_file NUMERIC(12, 2),
  bond_insurance_on_file BOOLEAN DEFAULT FALSE,
  bond_required NUMERIC(12, 2),
  bond_on_file NUMERIC(12, 2),

  -- Safety performance data
  vehicle_inspections INTEGER,
  vehicle_oos INTEGER, -- Out of Service
  vehicle_oos_rate NUMERIC(5, 2),
  driver_inspections INTEGER,
  driver_oos INTEGER,
  driver_oos_rate NUMERIC(5, 2),
  hazmat_inspections INTEGER,
  hazmat_oos INTEGER,
  hazmat_oos_rate NUMERIC(5, 2),

  -- Crash data
  fatal_crashes INTEGER,
  injury_crashes INTEGER,
  tow_crashes INTEGER,
  total_crashes INTEGER,

  -- Fleet info
  power_units INTEGER,
  drivers INTEGER,

  -- Computed risk assessment
  risk_level TEXT CHECK (risk_level IN ('HIGH', 'MEDIUM', 'LOW')),
  risk_score NUMERIC(3, 0), -- 0-100 score
  warnings JSONB, -- Array of warning messages

  -- Metadata
  verified_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
  verification_source TEXT DEFAULT 'FMCSA_SAFER',
  raw_response JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT carrier_verification_unique_mc UNIQUE(mc_number, expires_at),
  CONSTRAINT carrier_verification_unique_dot UNIQUE(dot_number, expires_at)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_carrier_verifications_mc ON carrier_verifications(mc_number);
CREATE INDEX IF NOT EXISTS idx_carrier_verifications_dot ON carrier_verifications(dot_number);
CREATE INDEX IF NOT EXISTS idx_carrier_verifications_carrier ON carrier_verifications(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_verifications_risk ON carrier_verifications(risk_level);
CREATE INDEX IF NOT EXISTS idx_carrier_verifications_expires ON carrier_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_carrier_verifications_status ON carrier_verifications(operating_status);

-- Enable RLS
ALTER TABLE carrier_verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view carrier verifications from their organization"
ON carrier_verifications
FOR SELECT
TO authenticated
USING (
  carrier_id IN (
    SELECT c.id
    FROM carriers c
    WHERE c.organization_id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create carrier verifications for their organization"
ON carrier_verifications
FOR INSERT
TO authenticated
WITH CHECK (
  carrier_id IN (
    SELECT c.id
    FROM carriers c
    WHERE c.organization_id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update carrier verifications for their organization"
ON carrier_verifications
FOR UPDATE
TO authenticated
USING (
  carrier_id IN (
    SELECT c.id
    FROM carriers c
    WHERE c.organization_id IN (
      SELECT organization_id
      FROM user_organizations
      WHERE user_id = auth.uid()
    )
  )
);

-- Function to calculate risk score
CREATE OR REPLACE FUNCTION calculate_carrier_risk_score(
  p_operating_status TEXT,
  p_safety_rating TEXT,
  p_insurance_adequate BOOLEAN,
  p_vehicle_oos_rate NUMERIC,
  p_driver_oos_rate NUMERIC,
  p_authority_date DATE,
  p_out_of_service_date DATE
) RETURNS JSONB AS $$
DECLARE
  v_risk_score INTEGER := 100; -- Start with perfect score
  v_risk_level TEXT;
  v_warnings JSONB := '[]'::JSONB;
  v_authority_age_days INTEGER;
BEGIN
  -- Calculate authority age in days
  v_authority_age_days := COALESCE(EXTRACT(DAY FROM (CURRENT_DATE - p_authority_date)), 9999);

  -- Operating status check (critical)
  IF p_operating_status IS NULL OR p_operating_status != 'AUTHORIZED' THEN
    v_risk_score := v_risk_score - 50;
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'CRITICAL',
      'message', 'Carrier is not authorized to operate: ' || COALESCE(p_operating_status, 'Unknown status')
    );
  END IF;

  -- Out of service check (critical)
  IF p_out_of_service_date IS NOT NULL THEN
    v_risk_score := v_risk_score - 40;
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'CRITICAL',
      'message', 'Carrier placed out of service on ' || p_out_of_service_date::TEXT
    );
  END IF;

  -- Safety rating check
  CASE p_safety_rating
    WHEN 'UNSATISFACTORY' THEN
      v_risk_score := v_risk_score - 35;
      v_warnings := v_warnings || jsonb_build_object(
        'type', 'CRITICAL',
        'message', 'Unsatisfactory safety rating'
      );
    WHEN 'CONDITIONAL' THEN
      v_risk_score := v_risk_score - 20;
      v_warnings := v_warnings || jsonb_build_object(
        'type', 'WARNING',
        'message', 'Conditional safety rating - monitor closely'
      );
    ELSE
      -- SATISFACTORY or NOT RATED - no penalty
  END CASE;

  -- Insurance check
  IF NOT COALESCE(p_insurance_adequate, FALSE) THEN
    v_risk_score := v_risk_score - 30;
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'CRITICAL',
      'message', 'Insurance coverage is inadequate or not on file'
    );
  END IF;

  -- New carrier check (< 90 days)
  IF v_authority_age_days < 90 THEN
    v_risk_score := v_risk_score - 15;
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'WARNING',
      'message', 'New carrier - authority less than 90 days old'
    );
  ELSIF v_authority_age_days < 180 THEN
    v_risk_score := v_risk_score - 5;
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'INFO',
      'message', 'Relatively new carrier - authority less than 180 days old'
    );
  END IF;

  -- Vehicle OOS rate check (national average ~20.7%)
  IF p_vehicle_oos_rate IS NOT NULL THEN
    IF p_vehicle_oos_rate > 30 THEN
      v_risk_score := v_risk_score - 15;
      v_warnings := v_warnings || jsonb_build_object(
        'type', 'WARNING',
        'message', 'High vehicle out-of-service rate: ' || p_vehicle_oos_rate || '% (national avg: 20.7%)'
      );
    ELSIF p_vehicle_oos_rate > 20.7 THEN
      v_risk_score := v_risk_score - 5;
      v_warnings := v_warnings || jsonb_build_object(
        'type', 'INFO',
        'message', 'Vehicle OOS rate above national average: ' || p_vehicle_oos_rate || '%'
      );
    END IF;
  END IF;

  -- Driver OOS rate check (national average ~5.5%)
  IF p_driver_oos_rate IS NOT NULL THEN
    IF p_driver_oos_rate > 10 THEN
      v_risk_score := v_risk_score - 15;
      v_warnings := v_warnings || jsonb_build_object(
        'type', 'WARNING',
        'message', 'High driver out-of-service rate: ' || p_driver_oos_rate || '% (national avg: 5.5%)'
      );
    ELSIF p_driver_oos_rate > 5.5 THEN
      v_risk_score := v_risk_score - 5;
      v_warnings := v_warnings || jsonb_build_object(
        'type', 'INFO',
        'message', 'Driver OOS rate above national average: ' || p_driver_oos_rate || '%'
      );
    END IF;
  END IF;

  -- Ensure score doesn't go below 0
  v_risk_score := GREATEST(v_risk_score, 0);

  -- Determine risk level based on score
  IF v_risk_score >= 80 THEN
    v_risk_level := 'LOW';
  ELSIF v_risk_score >= 50 THEN
    v_risk_level := 'MEDIUM';
  ELSE
    v_risk_level := 'HIGH';
  END IF;

  RETURN jsonb_build_object(
    'risk_score', v_risk_score,
    'risk_level', v_risk_level,
    'warnings', v_warnings
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if cached verification is still valid
CREATE OR REPLACE FUNCTION get_valid_carrier_verification(
  p_mc_number TEXT,
  p_dot_number TEXT
) RETURNS carrier_verifications AS $$
DECLARE
  v_verification carrier_verifications;
BEGIN
  -- Try to find by MC number first
  IF p_mc_number IS NOT NULL THEN
    SELECT * INTO v_verification
    FROM carrier_verifications
    WHERE mc_number = p_mc_number
      AND expires_at > CURRENT_TIMESTAMP
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN v_verification;
    END IF;
  END IF;

  -- Try DOT number if MC not found
  IF p_dot_number IS NOT NULL THEN
    SELECT * INTO v_verification
    FROM carrier_verifications
    WHERE dot_number = p_dot_number
      AND expires_at > CURRENT_TIMESTAMP
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN v_verification;
    END IF;
  END IF;

  -- No valid cached verification found
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add verification status to carriers table
ALTER TABLE carriers
ADD COLUMN IF NOT EXISTS last_verification_id UUID REFERENCES carrier_verifications(id),
ADD COLUMN IF NOT EXISTS last_verification_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN (
  'VERIFIED_LOW_RISK',
  'VERIFIED_MEDIUM_RISK',
  'VERIFIED_HIGH_RISK',
  'UNVERIFIED',
  'VERIFICATION_FAILED'
)),
ADD COLUMN IF NOT EXISTS verification_warnings JSONB;