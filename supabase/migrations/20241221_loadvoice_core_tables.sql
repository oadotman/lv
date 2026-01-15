-- LoadVoice Core Tables Migration
-- This migration adds freight-specific tables while preserving existing functionality
-- Date: 2024-12-21

-- =====================================================
-- 1. LOADS TABLE - Core entity for freight shipments
-- =====================================================
CREATE TABLE IF NOT EXISTS loads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Status workflow
    status TEXT NOT NULL DEFAULT 'quoted' CHECK (status IN (
        'quoted',           -- Rate quoted to shipper
        'needs_carrier',    -- Load confirmed, searching for carrier
        'dispatched',       -- Carrier assigned, waiting for pickup
        'in_transit',       -- Load picked up, en route
        'delivered',        -- Load delivered, awaiting POD
        'completed',        -- All paperwork received, ready for billing
        'cancelled'         -- Load cancelled
    )),

    -- Location information
    origin_city TEXT NOT NULL,
    origin_state TEXT NOT NULL,
    origin_zip TEXT,
    origin_address TEXT,
    destination_city TEXT NOT NULL,
    destination_state TEXT NOT NULL,
    destination_zip TEXT,
    destination_address TEXT,

    -- Load details
    commodity TEXT NOT NULL,
    weight_lbs INTEGER,
    pallet_count INTEGER,
    equipment_type TEXT CHECK (equipment_type IN (
        'dry_van', 'reefer', 'flatbed', 'step_deck', 'rgn',
        'conestoga', 'power_only', 'box_truck', 'hotshot', 'tanker'
    )),
    special_requirements TEXT[],

    -- Dates and times
    pickup_date DATE NOT NULL,
    pickup_time TIME,
    pickup_window_start TIME,
    pickup_window_end TIME,
    delivery_date DATE NOT NULL,
    delivery_time TIME,
    delivery_window_start TIME,
    delivery_window_end TIME,

    -- Financial
    shipper_rate DECIMAL(10,2),
    carrier_rate DECIMAL(10,2),
    margin DECIMAL(10,2) GENERATED ALWAYS AS (shipper_rate - carrier_rate) STORED,
    margin_percent DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN shipper_rate > 0 THEN ((shipper_rate - carrier_rate) / shipper_rate * 100)
            ELSE 0
        END
    ) STORED,

    -- Relationships
    shipper_id UUID,
    carrier_id UUID,
    source_call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    rate_confirmation_id UUID,

    -- Reference numbers
    reference_number TEXT,
    po_number TEXT,
    bol_number TEXT,

    -- Additional info
    notes TEXT,
    internal_notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX idx_loads_organization_id ON loads(organization_id);
CREATE INDEX idx_loads_status ON loads(status);
CREATE INDEX idx_loads_pickup_date ON loads(pickup_date);
CREATE INDEX idx_loads_delivery_date ON loads(delivery_date);
CREATE INDEX idx_loads_shipper_id ON loads(shipper_id);
CREATE INDEX idx_loads_carrier_id ON loads(carrier_id);
CREATE INDEX idx_loads_origin_dest ON loads(origin_city, origin_state, destination_city, destination_state);

-- =====================================================
-- 2. CARRIERS TABLE - Carrier database with auto-population
-- =====================================================
CREATE TABLE IF NOT EXISTS carriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Identification
    carrier_name TEXT NOT NULL,
    mc_number TEXT,
    dot_number TEXT,

    -- Contact information
    dispatcher_name TEXT,
    dispatcher_phone TEXT,
    dispatcher_email TEXT,
    driver_name TEXT,
    driver_phone TEXT,

    -- Company details
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,

    -- Equipment and lanes
    equipment_types TEXT[],
    preferred_lanes JSONB, -- Array of {origin_city, origin_state, dest_city, dest_state}

    -- Performance tracking
    rating DECIMAL(3,2) CHECK (rating >= 0 AND rating <= 5),
    on_time_percentage DECIMAL(5,2),
    total_loads INTEGER DEFAULT 0,
    completed_loads INTEGER DEFAULT 0,
    cancelled_loads INTEGER DEFAULT 0,

    -- Financial
    average_rate DECIMAL(10,2),
    last_rate DECIMAL(10,2),
    total_revenue DECIMAL(12,2) DEFAULT 0,

    -- Status and compliance
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted', 'preferred')),
    insurance_on_file BOOLEAN DEFAULT false,
    w9_on_file BOOLEAN DEFAULT false,
    authority_on_file BOOLEAN DEFAULT false,

    -- Notes and tags
    notes TEXT,
    tags TEXT[],

    -- Auto-population tracking
    auto_created BOOLEAN DEFAULT false,
    source_call_ids UUID[], -- Array of call IDs that contributed to this carrier

    -- Timestamps
    last_used_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX idx_carriers_organization_id ON carriers(organization_id);
CREATE INDEX idx_carriers_mc_number ON carriers(mc_number);
CREATE INDEX idx_carriers_status ON carriers(status);
CREATE INDEX idx_carriers_rating ON carriers(rating DESC);
CREATE UNIQUE INDEX idx_carriers_mc_org ON carriers(mc_number, organization_id) WHERE mc_number IS NOT NULL;

-- =====================================================
-- 3. SHIPPERS TABLE - Customer/shipper database
-- =====================================================
CREATE TABLE IF NOT EXISTS shippers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Company information
    shipper_name TEXT NOT NULL,
    company_name TEXT,

    -- Contact details
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,

    -- Business metrics
    total_loads INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    average_margin_percent DECIMAL(5,2),

    -- Credit and payment
    credit_status TEXT DEFAULT 'good' CHECK (credit_status IN ('good', 'warning', 'hold', 'cod')),
    payment_terms TEXT,
    credit_limit DECIMAL(10,2),
    balance_due DECIMAL(10,2) DEFAULT 0,

    -- Preferences
    preferred_equipment TEXT[],
    common_commodities TEXT[],
    special_requirements TEXT,

    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),

    -- Notes
    notes TEXT,
    tags TEXT[],

    -- Auto-population tracking
    auto_created BOOLEAN DEFAULT false,
    source_call_ids UUID[],

    -- Timestamps
    last_load_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX idx_shippers_organization_id ON shippers(organization_id);
CREATE INDEX idx_shippers_status ON shippers(status);
CREATE INDEX idx_shippers_credit_status ON shippers(credit_status);

-- =====================================================
-- 4. LANES TABLE - Lane intelligence and history
-- =====================================================
CREATE TABLE IF NOT EXISTS lanes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Lane definition
    origin_city TEXT NOT NULL,
    origin_state TEXT NOT NULL,
    destination_city TEXT NOT NULL,
    destination_state TEXT NOT NULL,

    -- Metrics
    load_count INTEGER DEFAULT 0,
    average_rate DECIMAL(10,2),
    min_rate DECIMAL(10,2),
    max_rate DECIMAL(10,2),
    last_rate DECIMAL(10,2),
    average_margin_percent DECIMAL(5,2),

    -- Carrier performance on lane
    best_carriers UUID[], -- Array of carrier IDs
    carrier_rates JSONB, -- {carrier_id: average_rate}

    -- Temporal patterns
    seasonality_data JSONB,
    busiest_months INTEGER[],

    -- Auto-calculated distance (can be updated via API)
    distance_miles INTEGER,

    -- Timestamps
    last_load_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_lanes_organization_id ON lanes(organization_id);
CREATE INDEX idx_lanes_route ON lanes(origin_city, origin_state, destination_city, destination_state);
CREATE UNIQUE INDEX idx_lanes_unique_route ON lanes(organization_id, origin_city, origin_state, destination_city, destination_state);

-- =====================================================
-- 5. RATE CONFIRMATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS rate_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,

    -- Document details
    rate_con_number TEXT UNIQUE,
    pdf_url TEXT,

    -- Status tracking
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'cancelled')),
    sent_at TIMESTAMPTZ,
    sent_to_email TEXT,
    signed_at TIMESTAMPTZ,
    signed_by TEXT,

    -- Version control
    version INTEGER DEFAULT 1,
    is_latest BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rate_confirmations_load_id ON rate_confirmations(load_id);
CREATE INDEX idx_rate_confirmations_organization_id ON rate_confirmations(organization_id);
CREATE INDEX idx_rate_confirmations_number ON rate_confirmations(rate_con_number);

-- =====================================================
-- 6. EXTRACTION MAPPINGS - Link extractions to entities
-- =====================================================
CREATE TABLE IF NOT EXISTS extraction_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Source
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    extraction_type TEXT NOT NULL CHECK (extraction_type IN ('shipper', 'carrier', 'check')),

    -- Mapped entities
    load_id UUID REFERENCES loads(id) ON DELETE SET NULL,
    carrier_id UUID REFERENCES carriers(id) ON DELETE SET NULL,
    shipper_id UUID REFERENCES shippers(id) ON DELETE SET NULL,

    -- Extraction data (preserved even if entities are deleted)
    extracted_data JSONB NOT NULL,
    confidence_scores JSONB,

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'saved', 'discarded')),
    saved_at TIMESTAMPTZ,
    saved_by UUID REFERENCES auth.users(id),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_extraction_mappings_call_id ON extraction_mappings(call_id);
CREATE INDEX idx_extraction_mappings_load_id ON extraction_mappings(load_id);
CREATE INDEX idx_extraction_mappings_status ON extraction_mappings(status);

-- =====================================================
-- 7. UPDATE ORGANIZATIONS TABLE for LoadVoice
-- =====================================================
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'loadvoice';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_city TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_state TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_zip TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS mc_number TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS dot_number TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS rate_con_terms TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_payment_terms TEXT DEFAULT 'Net 30';

-- =====================================================
-- 8. LOAD STATUS HISTORY (for tracking workflow)
-- =====================================================
CREATE TABLE IF NOT EXISTS load_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    load_id UUID NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_load_status_history_load_id ON load_status_history(load_id);

-- =====================================================
-- 9. EXTRACTION INBOX (for batch processing)
-- =====================================================
CREATE TABLE IF NOT EXISTS extraction_inbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'saved', 'discarded')),

    -- Priority
    priority INTEGER DEFAULT 0,
    flagged_for_review BOOLEAN DEFAULT false,
    review_reason TEXT,

    -- Processing
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_extraction_inbox_organization_id ON extraction_inbox(organization_id);
CREATE INDEX idx_extraction_inbox_status ON extraction_inbox(status);
CREATE INDEX idx_extraction_inbox_priority ON extraction_inbox(priority DESC);

-- =====================================================
-- 10. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shippers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_inbox ENABLE ROW LEVEL SECURITY;

-- Loads policies
CREATE POLICY "Users can view their organization's loads" ON loads
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create loads for their organization" ON loads
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their organization's loads" ON loads
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their organization's loads" ON loads
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Carriers policies (similar pattern)
CREATE POLICY "Users can view their organization's carriers" ON carriers
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create carriers for their organization" ON carriers
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their organization's carriers" ON carriers
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their organization's carriers" ON carriers
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Shippers policies (similar pattern)
CREATE POLICY "Users can view their organization's shippers" ON shippers
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create shippers for their organization" ON shippers
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their organization's shippers" ON shippers
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their organization's shippers" ON shippers
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Lanes policies
CREATE POLICY "Users can view their organization's lanes" ON lanes
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their organization's lanes" ON lanes
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

-- Rate confirmations policies
CREATE POLICY "Users can view their organization's rate confirmations" ON rate_confirmations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their organization's rate confirmations" ON rate_confirmations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

-- Extraction mappings policies
CREATE POLICY "Users can view their organization's extraction mappings" ON extraction_mappings
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their organization's extraction mappings" ON extraction_mappings
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

-- Load status history policies
CREATE POLICY "Users can view load status history" ON load_status_history
    FOR SELECT USING (
        load_id IN (
            SELECT id FROM loads WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create load status history" ON load_status_history
    FOR INSERT WITH CHECK (
        load_id IN (
            SELECT id FROM loads WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    );

-- Extraction inbox policies
CREATE POLICY "Users can view their organization's extraction inbox" ON extraction_inbox
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their organization's extraction inbox" ON extraction_inbox
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- 11. HELPER FUNCTIONS
-- =====================================================

-- Function to update load status with history tracking
CREATE OR REPLACE FUNCTION update_load_status(
    p_load_id UUID,
    p_new_status TEXT,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_old_status TEXT;
BEGIN
    -- Get current status
    SELECT status INTO v_old_status FROM loads WHERE id = p_load_id;

    -- Update load status
    UPDATE loads
    SET status = p_new_status,
        updated_at = NOW(),
        updated_by = p_user_id
    WHERE id = p_load_id;

    -- Record history
    INSERT INTO load_status_history (load_id, old_status, new_status, changed_by, notes)
    VALUES (p_load_id, v_old_status, p_new_status, p_user_id, p_notes);
END;
$$ LANGUAGE plpgsql;

-- Function to auto-update lane statistics when a load is saved
CREATE OR REPLACE FUNCTION update_lane_statistics() RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert lane record
    INSERT INTO lanes (
        organization_id,
        origin_city,
        origin_state,
        destination_city,
        destination_state,
        load_count,
        average_rate,
        min_rate,
        max_rate,
        last_rate,
        last_load_date
    )
    VALUES (
        NEW.organization_id,
        NEW.origin_city,
        NEW.origin_state,
        NEW.destination_city,
        NEW.destination_state,
        1,
        NEW.shipper_rate,
        NEW.shipper_rate,
        NEW.shipper_rate,
        NEW.shipper_rate,
        NEW.pickup_date
    )
    ON CONFLICT (organization_id, origin_city, origin_state, destination_city, destination_state)
    DO UPDATE SET
        load_count = lanes.load_count + 1,
        average_rate = (lanes.average_rate * lanes.load_count + NEW.shipper_rate) / (lanes.load_count + 1),
        min_rate = LEAST(lanes.min_rate, NEW.shipper_rate),
        max_rate = GREATEST(lanes.max_rate, NEW.shipper_rate),
        last_rate = NEW.shipper_rate,
        last_load_date = NEW.pickup_date,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for lane statistics
CREATE TRIGGER update_lane_stats_on_load_insert
    AFTER INSERT ON loads
    FOR EACH ROW
    EXECUTE FUNCTION update_lane_statistics();

-- Function to update carrier statistics when a load is completed
CREATE OR REPLACE FUNCTION update_carrier_statistics() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND NEW.carrier_id IS NOT NULL THEN
        UPDATE carriers
        SET
            total_loads = total_loads + 1,
            completed_loads = completed_loads + 1,
            last_rate = NEW.carrier_rate,
            total_revenue = total_revenue + NEW.carrier_rate,
            average_rate = (total_revenue + NEW.carrier_rate) / (completed_loads + 1),
            last_used_date = NOW(),
            updated_at = NOW()
        WHERE id = NEW.carrier_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for carrier statistics
CREATE TRIGGER update_carrier_stats_on_load_complete
    AFTER UPDATE ON loads
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
    EXECUTE FUNCTION update_carrier_statistics();

-- Function to update shipper statistics
CREATE OR REPLACE FUNCTION update_shipper_statistics() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.shipper_id IS NOT NULL THEN
        UPDATE shippers
        SET
            total_loads = total_loads + 1,
            total_revenue = total_revenue + NEW.shipper_rate,
            last_load_date = NEW.pickup_date,
            updated_at = NOW()
        WHERE id = NEW.shipper_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for shipper statistics
CREATE TRIGGER update_shipper_stats_on_load_insert
    AFTER INSERT ON loads
    FOR EACH ROW
    EXECUTE FUNCTION update_shipper_statistics();

-- =====================================================
-- 12. SEED DATA FOR TESTING (Optional - remove in production)
-- =====================================================

-- Add freight-specific call types to existing calls if needed
UPDATE calls SET call_type = 'shipper_call' WHERE call_type IN ('sales', 'inbound');
UPDATE calls SET call_type = 'carrier_call' WHERE call_type IN ('vendor', 'outbound');

-- =====================================================
-- 13. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT ALL ON loads TO authenticated;
GRANT ALL ON carriers TO authenticated;
GRANT ALL ON shippers TO authenticated;
GRANT ALL ON lanes TO authenticated;
GRANT ALL ON rate_confirmations TO authenticated;
GRANT ALL ON extraction_mappings TO authenticated;
GRANT ALL ON load_status_history TO authenticated;
GRANT ALL ON extraction_inbox TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- This migration adds all core LoadVoice tables while preserving existing functionality
-- Next steps:
-- 1. Update application code to use new tables
-- 2. Configure extraction prompts for freight context
-- 3. Build UI components for loads, carriers, shippers
-- 4. Implement extraction → CRM save flow