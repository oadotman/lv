-- Migration: Carrier Auto-Population System
-- Description: Adds tables and columns for automatic carrier database population from calls

-- Add new columns to carriers table if they don't exist
ALTER TABLE carriers
ADD COLUMN IF NOT EXISTS alt_phone TEXT,
ADD COLUMN IF NOT EXISTS equipment_types TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_lanes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS completed_loads INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS performance_score INTEGER,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS first_contact_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_from_call_id UUID,
ADD COLUMN IF NOT EXISTS statistics_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_load_date TIMESTAMP WITH TIME ZONE;

-- Create carrier_calls table for tracking call history
CREATE TABLE IF NOT EXISTS carrier_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  call_date TIMESTAMP WITH TIME ZONE NOT NULL,
  quoted_rate DECIMAL(10,2),
  available_date DATE,
  equipment_mentioned TEXT[],
  lanes_mentioned TEXT[],
  contact_name TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate entries
  UNIQUE(carrier_id, call_id)
);

-- Create carrier_loads table for load relationships
CREATE TABLE IF NOT EXISTS carrier_loads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  quoted_rate DECIMAL(10,2),
  final_rate DECIMAL(10,2),
  status TEXT DEFAULT 'quoted',
  quoted_at TIMESTAMP WITH TIME ZONE,
  dispatched_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  performance_notes TEXT,
  on_time BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate entries
  UNIQUE(carrier_id, load_id)
);

-- Add columns to loads table for carrier tracking
ALTER TABLE loads
ADD COLUMN IF NOT EXISTS carrier_assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS driver_name TEXT,
ADD COLUMN IF NOT EXISTS driver_phone TEXT,
ADD COLUMN IF NOT EXISTS actual_pickup_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_delivery_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_from_call BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS source TEXT;

-- Add columns to calls table for entity associations
ALTER TABLE calls
ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES carriers(id),
ADD COLUMN IF NOT EXISTS load_id UUID REFERENCES loads(id),
ADD COLUMN IF NOT EXISTS shipper_id UUID REFERENCES shippers(id),
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS processing_notes JSONB;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_carriers_mc_number ON carriers(mc_number) WHERE mc_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carriers_phone ON carriers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carriers_organization ON carriers(organization_id);
CREATE INDEX IF NOT EXISTS idx_carriers_performance ON carriers(performance_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_carrier_calls_carrier ON carrier_calls(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_calls_call ON carrier_calls(call_id);
CREATE INDEX IF NOT EXISTS idx_carrier_calls_date ON carrier_calls(call_date DESC);

CREATE INDEX IF NOT EXISTS idx_carrier_loads_carrier ON carrier_loads(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_loads_load ON carrier_loads(load_id);
CREATE INDEX IF NOT EXISTS idx_carrier_loads_status ON carrier_loads(status);

CREATE INDEX IF NOT EXISTS idx_calls_carrier ON calls(carrier_id) WHERE carrier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calls_load ON calls(load_id) WHERE load_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calls_processing ON calls(processing_status);

-- Function to update carrier statistics
CREATE OR REPLACE FUNCTION update_carrier_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update carrier's active loads count
  UPDATE carriers
  SET active_loads = (
    SELECT COUNT(*)
    FROM loads
    WHERE carrier_id = NEW.carrier_id
    AND status IN ('dispatched', 'in_transit', 'delivered')
  )
  WHERE id = NEW.carrier_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update carrier statistics when load changes
DROP TRIGGER IF EXISTS update_carrier_on_load_change ON loads;
CREATE TRIGGER update_carrier_on_load_change
  AFTER INSERT OR UPDATE OF carrier_id, status
  ON loads
  FOR EACH ROW
  WHEN (NEW.carrier_id IS NOT NULL)
  EXECUTE FUNCTION update_carrier_statistics();

-- Function to calculate carrier performance score
CREATE OR REPLACE FUNCTION calculate_carrier_performance_score(carrier_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  on_time_pct DECIMAL;
  completion_rate DECIMAL;
  total_loads_count INTEGER;
  completed_loads_count INTEGER;
  score INTEGER;
BEGIN
  -- Get load counts
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_loads_count, completed_loads_count
  FROM loads
  WHERE carrier_id = carrier_uuid;

  -- Calculate completion rate
  IF total_loads_count > 0 THEN
    completion_rate := (completed_loads_count::DECIMAL / total_loads_count) * 100;
  ELSE
    completion_rate := 100;
  END IF;

  -- Calculate on-time percentage
  SELECT
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('delivered', 'completed')) > 0 THEN
        (COUNT(*) FILTER (
          WHERE status IN ('delivered', 'completed')
          AND (actual_delivery_date IS NULL OR actual_delivery_date <= delivery_date)
        )::DECIMAL / COUNT(*) FILTER (WHERE status IN ('delivered', 'completed'))) * 100
      ELSE 100
    END
  INTO on_time_pct
  FROM loads
  WHERE carrier_id = carrier_uuid;

  -- Calculate weighted score
  score := ROUND(
    (on_time_pct * 0.4) +           -- 40% weight for on-time
    (completion_rate * 0.3) +        -- 30% weight for completion
    (LEAST(total_loads_count * 2, 100) * 0.3)  -- 30% weight for experience (max at 50 loads)
  );

  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE carrier_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrier_loads ENABLE ROW LEVEL SECURITY;

-- Policy for carrier_calls
CREATE POLICY "Users can view carrier calls in their organization"
  ON carrier_calls
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM carriers
      WHERE carriers.id = carrier_calls.carrier_id
      AND carriers.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy for carrier_loads
CREATE POLICY "Users can view carrier loads in their organization"
  ON carrier_loads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM carriers
      WHERE carriers.id = carrier_loads.carrier_id
      AND carriers.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Sample data for testing (optional - remove in production)
-- INSERT INTO carriers (organization_id, name, mc_number, phone, equipment_types, preferred_lanes, performance_score)
-- VALUES
--   ('{your-org-id}', 'Swift Transport LLC', 'MC-123456', '(800) 555-0100', ARRAY['Dry Van', 'Reefer'], ARRAY['IL-TX', 'TX-CA'], 85),
--   ('{your-org-id}', 'Knight Transportation', 'MC-234567', '(800) 555-0200', ARRAY['Flatbed', 'Step Deck'], ARRAY['CA-AZ', 'AZ-NM'], 92);

COMMENT ON TABLE carrier_calls IS 'Tracks all calls with carriers for history and relationship management';
COMMENT ON TABLE carrier_loads IS 'Junction table tracking carrier-load relationships and performance';
COMMENT ON COLUMN carriers.performance_score IS 'Calculated score 0-100 based on on-time %, completion rate, and experience';
COMMENT ON COLUMN carriers.source IS 'How the carrier was added: manual, carrier_call, referral, etc';
COMMENT ON COLUMN calls.processing_status IS 'Status of automatic processing: pending, processing, completed, failed';
COMMENT ON COLUMN calls.processing_notes IS 'JSON data about what was extracted and processed from the call';