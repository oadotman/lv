export type CallStatus = "completed" | "processing" | "failed";
export type SentimentType = "positive" | "neutral" | "negative";

export interface Call {
  id: string;
  callDate: string;
  customerName: string;
  salesRep: string;
  duration: number; // in seconds
  status: CallStatus;
  outcome?: string;
  sentiment?: SentimentType;
  sentimentScore?: number; // 0-100
}

export interface TranscriptMessage {
  id: string;
  speaker: "broker" | "shipper" | "carrier" | "driver" | "customer";
  timestamp: string;
  sentiment: "positive" | "neutral" | "negative";
  message: string;
}

export interface CallInsight {
  type: "pain_point" | "action_item" | "competitor";
  text: string;
}

export interface CallDetail extends Call {
  audioUrl?: string;
  transcript: TranscriptMessage[];
  insights: CallInsight[];
  crmOutputs: {
    plain: string;
    hubspot: string;
    salesforce: string;
    csv: string;
  };
}

export interface Template {
  id: string;
  name: string;
  fieldCount: number;
  fields: TemplateField[];
  isSelected?: boolean;
  usageCount?: number;
  category?: "standard" | "custom";
  lastModified?: string;
}

export interface TemplateField {
  id: string;
  fieldName: string;
  fieldType: "text" | "textarea" | "email" | "number" | "date" | "picklist";
  description: string;
  picklistValues?: string[];
}

export interface MetricCard {
  title: string;
  value: string;
  trend?: {
    value: string;
    direction: "up" | "down";
  };
  subtitle?: string;
  link?: string;
}

export interface User {
  name: string;
  email: string;
  company: string;
  avatar?: string;
}

// =====================================================
// FREIGHT/LOAD TYPES
// =====================================================

export type LoadStatus =
  | "quoted"           // Rate quoted to shipper, awaiting confirmation
  | "needs_carrier"    // Load confirmed, searching for carrier
  | "dispatched"       // Carrier assigned, waiting for pickup
  | "in_transit"       // Load picked up, en route to delivery
  | "delivered"        // Load delivered, awaiting paperwork/POD
  | "completed"        // All paperwork received, ready for billing
  | "cancelled";       // Load cancelled

export type EquipmentType =
  | "dry_van"
  | "reefer"
  | "flatbed"
  | "step_deck"
  | "rgn"
  | "power_only"
  | "box_truck"
  | "hotshot"
  | "tanker"
  | "lowboy"
  | "double_drop"
  | "conestoga"
  | "other";

export interface Load {
  // Core identifiers
  id: string;
  organization_id: string;

  // Status tracking
  status: LoadStatus;

  // Origin information
  origin_city: string;
  origin_state: string;
  origin_facility?: string;
  origin_zip?: string;
  pickup_address?: string;
  pickup_time_window?: string;
  pickup_contact?: string;
  pickup_phone?: string;
  pickup_notes?: string;

  // Destination information
  destination_city: string;
  destination_state: string;
  destination_facility?: string;
  destination_zip?: string;
  delivery_address?: string;
  delivery_time_window?: string;
  delivery_contact?: string;
  delivery_phone?: string;
  delivery_notes?: string;

  // Load details
  commodity: string;
  weight_lbs: number;
  weight?: number;  // Alias for weight_lbs (used in some pages)
  pallets?: number;
  equipment_type: EquipmentType;
  special_instructions?: string;

  // Dates and times
  pickup_date: string;        // ISO date string (YYYY-MM-DD)
  pickup_time?: string;       // Time window (e.g., "08:00-12:00" or "FCFS")
  delivery_date: string;      // ISO date string (YYYY-MM-DD)
  delivery_time?: string;     // Time window (e.g., "14:00-18:00" or "By appointment")

  // Financial
  rate_to_shipper: number;    // What the shipper pays
  rate_to_carrier?: number;   // What we pay the carrier
  margin?: number;            // Profit margin (rate_to_shipper - rate_to_carrier)
  margin_percentage?: number;  // Margin as percentage
  payment_terms?: string;      // Payment terms

  // Additional details
  special_requirements?: string[];  // ["Tarps required", "Team drivers", "TWIC card", etc.]
  reference_number?: string;        // Customer reference/PO number

  // Relationships
  shipper_id?: string;        // Reference to shipper/customer
  carrier_id?: string;        // Reference to carrier (when booked)

  // Metadata
  created_at: string;         // ISO datetime
  updated_at: string;         // ISO datetime

  // Optional extended fields
  distance_miles?: number;
  distance?: number;           // Alias for distance_miles (used in some pages)
  fuel_surcharge?: number;
  detention_time?: number;
  accessorial_charges?: number;
  notes?: string;
  bol_number?: string;
  po_number?: string;
  pro_number?: string;

  // Contact information (denormalized for quick access)
  shipper_contact_name?: string;
  shipper_contact_phone?: string;
  shipper_contact_email?: string;
  carrier_contact_name?: string;
  carrier_contact_phone?: string;
  driver_name?: string;
  driver_phone?: string;
  truck_number?: string;
  trailer_number?: string;

  // Tracking
  last_check_call?: string;   // ISO datetime of last status update
  current_location?: string;
  eta_pickup?: string;
  eta_delivery?: string;

  // Compliance
  mc_number?: string;
  dot_number?: string;
  insurance_on_file?: boolean;
  w9_on_file?: boolean;

  // Related call IDs (for tracking which calls are associated with this load)
  related_call_ids?: string[];
}

// Helper type for load creation (without id and timestamps)
export type CreateLoadInput = Omit<Load, 'id' | 'created_at' | 'updated_at' | 'margin'> & {
  margin?: number;
};

// Helper type for load updates (all fields optional except id)
export type UpdateLoadInput = Partial<Omit<Load, 'id' | 'organization_id' | 'created_at'>> & {
  id: string;
};

// Load summary for list views
export interface LoadSummary {
  id: string;
  status: LoadStatus;
  origin_city: string;
  origin_state: string;
  destination_city: string;
  destination_state: string;
  commodity: string;
  pickup_date: string;
  delivery_date: string;
  rate_to_shipper: number;
  equipment_type: EquipmentType;
  shipper_name?: string;
  carrier_name?: string;
  margin?: number;
}

// Load filters for search/filtering
export interface LoadFilters {
  status?: LoadStatus[];
  equipment_type?: EquipmentType[];
  origin_state?: string[];
  destination_state?: string[];
  pickup_date_from?: string;
  pickup_date_to?: string;
  delivery_date_from?: string;
  delivery_date_to?: string;
  min_rate?: number;
  max_rate?: number;
  shipper_id?: string;
  carrier_id?: string;
  search_query?: string;  // Search across reference#, commodity, cities, etc.
}

// =====================================================
// CARRIER TYPES
// =====================================================

export type CarrierRating = 1 | 2 | 3 | 4 | 5;

export interface Carrier {
  // Core identifiers
  id: string;
  organization_id: string;

  // Company information
  carrier_name: string;
  mc_number?: string;         // Motor Carrier number (FMCSA)
  dot_number?: string;        // Department of Transportation number

  // Contact information
  primary_contact?: string;   // Main contact person name
  phone: string;              // Primary phone number
  email?: string;             // Primary email address

  // Operational details
  equipment_types: EquipmentType[];  // Array of equipment they operate
  notes?: string;                     // Internal notes about the carrier

  // Performance metrics
  user_rating?: CarrierRating;       // 1-5 star rating set by user
  total_loads: number;                // Total number of loads hauled (calculated)
  on_time_percentage?: number;        // Percentage of on-time deliveries (calculated)
  average_rate?: number;              // Average rate per mile or total (calculated)
  performance_score?: number;         // Overall performance score (0-100)
  active_loads?: number;              // Number of currently active loads
  lifetime_revenue?: number;          // Total revenue generated from this carrier

  // Activity tracking
  last_used_date?: string;            // ISO datetime of last load booked

  // Metadata
  created_at: string;                 // ISO datetime
  updated_at: string;                 // ISO datetime

  // Extended carrier information
  insurance_expiry?: string;          // Insurance expiration date
  insurance_amount?: number;          // Insurance coverage amount
  w9_on_file?: boolean;              // W9 tax form on file
  authority_status?: 'active' | 'inactive' | 'pending';  // FMCSA authority status
  verification_status?: 'NOT_VERIFIED' | 'VERIFIED_LOW_RISK' | 'VERIFIED_MEDIUM_RISK' | 'VERIFIED_HIGH_RISK' | 'VERIFICATION_FAILED';  // FMCSA verification status

  // Additional contact information
  secondary_contact?: string;
  secondary_phone?: string;
  secondary_email?: string;
  dispatch_phone?: string;
  dispatch_email?: string;
  after_hours_phone?: string;

  // Address information
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;

  // Payment information
  payment_terms?: 'quick_pay' | 'net_30' | 'net_15' | 'cod' | 'other';
  quick_pay_percentage?: number;     // Quick pay discount percentage
  preferred_payment_method?: 'check' | 'ach' | 'wire' | 'fuel_card';
  billing_email?: string;

  // Operational preferences
  preferred_lanes?: string[];        // Array of preferred lanes (e.g., ["TX-CA", "IL-FL"])
  driver_count?: number;              // Number of drivers
  truck_count?: number;               // Number of trucks
  home_base_city?: string;
  home_base_state?: string;
  operating_radius?: 'local' | 'regional' | 'national';
  hazmat_certified?: boolean;
  twic_certified?: boolean;
  team_drivers?: boolean;

  // Performance history
  total_revenue?: number;            // Total revenue generated (calculated)
  cancelled_loads?: number;          // Number of cancelled loads
  claims_filed?: number;             // Number of claims/issues
  average_detention_time?: number;   // Average detention time in hours

  // Compliance and certifications
  safety_rating?: 'satisfactory' | 'conditional' | 'unsatisfactory' | 'unrated';
  csa_scores?: {
    unsafe_driving?: number;
    hours_of_service?: number;
    driver_fitness?: number;
    controlled_substances?: number;
    vehicle_maintenance?: number;
    hazmat_compliance?: number;
    crash_indicator?: number;
  };

  // Flags and status
  is_preferred?: boolean;            // Marked as preferred carrier
  is_blocked?: boolean;              // Blocked from use
  block_reason?: string;             // Reason for blocking

  // Integration fields
  external_id?: string;              // ID in external TMS/load board
  dat_id?: string;                   // DAT directory ID
  truckstop_id?: string;            // Truckstop.com ID

  // Related data
  related_call_ids?: string[];       // Call IDs where this carrier was discussed
  load_ids?: string[];               // IDs of loads hauled by this carrier
  auto_created?: boolean;            // Flag for auto-populated carriers from AI extraction
}

// Helper type for carrier creation (without calculated fields)
export type CreateCarrierInput = Omit<Carrier,
  'id' |
  'created_at' |
  'updated_at' |
  'total_loads' |
  'on_time_percentage' |
  'average_rate' |
  'total_revenue' |
  'average_detention_time'
> & {
  total_loads?: number;
  on_time_percentage?: number;
  average_rate?: number;
  total_revenue?: number;
  average_detention_time?: number;
};

// Helper type for carrier updates (all fields optional except id)
export type UpdateCarrierInput = Partial<Omit<Carrier, 'id' | 'organization_id' | 'created_at'>> & {
  id: string;
};

// Carrier summary for list views
export interface CarrierSummary {
  id: string;
  carrier_name: string;
  mc_number?: string;
  phone: string;
  email?: string;
  equipment_types: EquipmentType[];
  user_rating?: CarrierRating;
  total_loads: number;
  on_time_percentage?: number;
  last_used_date?: string;
  is_preferred?: boolean;
  is_blocked?: boolean;
}

// Carrier performance metrics
export interface CarrierMetrics {
  carrier_id: string;
  carrier_name: string;

  // Performance over time periods
  loads_last_30_days: number;
  loads_last_90_days: number;
  loads_last_year: number;

  // Financial metrics
  revenue_last_30_days: number;
  revenue_last_90_days: number;
  revenue_last_year: number;
  average_margin_percentage: number;

  // Operational metrics
  on_time_pickup_percentage: number;
  on_time_delivery_percentage: number;
  average_transit_time_hours: number;
  average_miles_per_load: number;

  // Issue tracking
  total_issues: number;
  detention_incidents: number;
  damage_claims: number;
  service_failures: number;
}

// Carrier filters for search/filtering
export interface CarrierFilters {
  search_query?: string;              // Search across name, MC#, DOT#, contact
  equipment_types?: EquipmentType[];
  min_rating?: CarrierRating;
  authority_status?: ('active' | 'inactive' | 'pending')[];
  is_preferred?: boolean;
  is_blocked?: boolean;
  state?: string[];
  has_insurance?: boolean;
  has_w9?: boolean;
  last_used_from?: string;
  last_used_to?: string;
  min_total_loads?: number;
  min_on_time_percentage?: number;
}

// =====================================================
// SHIPPER TYPES
// =====================================================

export interface Shipper {
  // Core identifiers
  id: string;
  organization_id: string;

  // Company information
  company_name: string;
  primary_contact?: string;    // Main contact person name
  phone: string;               // Primary phone number
  email?: string;              // Primary email address

  // Address information
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip_code: string;
    country?: string;
  };

  // Shipping patterns
  typical_commodities: string[];      // Array of commodities they typically ship
  typical_equipment: EquipmentType[]; // Array of equipment types they typically need
  special_requirements?: string;      // Special requirements or preferences

  // Internal information
  notes?: string;                     // Internal notes about the shipper

  // Business metrics (calculated)
  total_loads: number;                // Total number of loads shipped
  total_revenue: number;              // Total revenue generated from this shipper

  // Metadata
  created_at: string;                 // ISO datetime
  updated_at: string;                 // ISO datetime

  // Extended shipper information
  industry?: string;                  // Industry type (e.g., "Manufacturing", "Retail", "Agriculture")
  business_type?: 'manufacturer' | 'distributor' | 'retailer' | 'wholesaler' | 'other';

  // Additional contacts
  secondary_contact?: string;
  secondary_phone?: string;
  secondary_email?: string;
  billing_contact?: string;
  billing_phone?: string;
  billing_email?: string;
  shipping_contact?: string;
  shipping_phone?: string;
  shipping_email?: string;

  // Shipping locations (if multiple facilities)
  shipping_locations?: Array<{
    facility_name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    zip_code: string;
    contact_name?: string;
    contact_phone?: string;
    hours_of_operation?: string;
    appointment_required?: boolean;
    notes?: string;
  }>;

  // Receiving locations (if different from shipping)
  receiving_locations?: Array<{
    facility_name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    zip_code: string;
    contact_name?: string;
    contact_phone?: string;
    hours_of_operation?: string;
    appointment_required?: boolean;
    notes?: string;
  }>;

  // Business preferences
  preferred_carriers?: string[];      // Array of preferred carrier IDs
  blocked_carriers?: string[];        // Array of blocked carrier IDs
  typical_lanes?: string[];          // Common shipping lanes (e.g., ["TX-CA", "IL-NY"])
  volume_tier?: 'high' | 'medium' | 'low';  // Volume classification

  // Payment and billing
  payment_terms?: 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'cod' | 'prepaid' | 'other';
  credit_limit?: number;
  credit_status?: 'approved' | 'pending' | 'hold' | 'denied';
  tax_id?: string;
  billing_method?: 'invoice' | 'credit_card' | 'ach' | 'other';

  // Operational requirements
  insurance_requirements?: {
    minimum_cargo?: number;
    minimum_liability?: number;
    additional_insured?: boolean;
  };
  tracking_requirements?: 'none' | 'basic' | 'real_time' | 'eld_integrated';
  document_requirements?: string[];   // ["BOL", "POD", "Weight tickets", etc.]

  // Performance metrics (calculated)
  average_loads_per_month?: number;
  average_revenue_per_load?: number;
  average_weight?: number;
  average_distance?: number;
  on_time_pickup_percentage?: number;
  on_time_delivery_percentage?: number;
  claims_ratio?: number;              // Claims as percentage of loads

  // Seasonal patterns
  peak_seasons?: string[];            // ["Q1", "Q4", "Summer", etc.]
  slow_seasons?: string[];

  // Communication preferences
  preferred_communication?: 'phone' | 'email' | 'text' | 'edi';
  edi_capable?: boolean;
  api_integration?: boolean;

  // Status and flags
  is_active?: boolean;                // Currently active shipper
  is_preferred?: boolean;             // Marked as preferred customer
  is_credit_hold?: boolean;           // On credit hold
  requires_approval?: boolean;        // Requires management approval for loads

  // Contract information
  contract_start_date?: string;
  contract_end_date?: string;
  contract_rates?: Array<{
    lane: string;
    rate: number;
    equipment_type: EquipmentType;
    effective_date: string;
    expiry_date?: string;
  }>;

  // Integration fields
  external_id?: string;               // ID in external TMS/CRM
  quickbooks_id?: string;             // QuickBooks customer ID
  salesforce_id?: string;             // Salesforce account ID

  // Related data
  related_call_ids?: string[];        // Call IDs where this shipper was discussed
  load_ids?: string[];                // IDs of loads from this shipper
  contact_ids?: string[];             // IDs of all contacts at this company
}

// Helper type for shipper creation (without calculated fields)
export type CreateShipperInput = Omit<Shipper,
  'id' |
  'created_at' |
  'updated_at' |
  'total_loads' |
  'total_revenue' |
  'average_loads_per_month' |
  'average_revenue_per_load' |
  'average_weight' |
  'average_distance' |
  'on_time_pickup_percentage' |
  'on_time_delivery_percentage' |
  'claims_ratio'
> & {
  total_loads?: number;
  total_revenue?: number;
  average_loads_per_month?: number;
  average_revenue_per_load?: number;
  average_weight?: number;
  average_distance?: number;
  on_time_pickup_percentage?: number;
  on_time_delivery_percentage?: number;
  claims_ratio?: number;
};

// Helper type for shipper updates (all fields optional except id)
export type UpdateShipperInput = Partial<Omit<Shipper, 'id' | 'organization_id' | 'created_at'>> & {
  id: string;
};

// Shipper summary for list views
export interface ShipperSummary {
  id: string;
  company_name: string;
  primary_contact?: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  total_loads: number;
  total_revenue: number;
  typical_commodities: string[];
  typical_equipment: EquipmentType[];
  is_active?: boolean;
  is_preferred?: boolean;
  volume_tier?: 'high' | 'medium' | 'low';
}

// Shipper analytics
export interface ShipperAnalytics {
  shipper_id: string;
  company_name: string;

  // Volume metrics by period
  loads_this_month: number;
  loads_last_month: number;
  loads_last_3_months: number;
  loads_last_12_months: number;

  // Revenue metrics by period
  revenue_this_month: number;
  revenue_last_month: number;
  revenue_last_3_months: number;
  revenue_last_12_months: number;

  // Growth metrics
  load_growth_percentage: number;     // Month over month
  revenue_growth_percentage: number;  // Month over month

  // Lane analysis
  top_lanes: Array<{
    origin: string;
    destination: string;
    load_count: number;
    total_revenue: number;
  }>;

  // Commodity analysis
  top_commodities: Array<{
    commodity: string;
    load_count: number;
    percentage: number;
  }>;

  // Equipment analysis
  equipment_usage: Array<{
    equipment_type: EquipmentType;
    load_count: number;
    percentage: number;
  }>;

  // Profitability
  average_margin: number;
  average_margin_percentage: number;
  total_margin: number;

  // Service metrics
  on_time_performance: number;
  claim_free_percentage: number;
  average_days_to_pay: number;
}

// Shipper filters for search/filtering
export interface ShipperFilters {
  search_query?: string;              // Search across name, contact, phone, email
  state?: string[];
  city?: string[];
  typical_commodities?: string[];
  typical_equipment?: EquipmentType[];
  volume_tier?: ('high' | 'medium' | 'low')[];
  is_active?: boolean;
  is_preferred?: boolean;
  is_credit_hold?: boolean;
  min_total_loads?: number;
  max_total_loads?: number;
  min_revenue?: number;
  max_revenue?: number;
  created_from?: string;
  created_to?: string;
  industry?: string[];
  payment_terms?: string[];
}

// =====================================================
// LANE TYPES (ORIGIN-DESTINATION PAIRS)
// =====================================================

export type RateTrend = 'up' | 'down' | 'stable';

export interface Lane {
  // Core identifiers
  id: string;
  organization_id: string;

  // Origin information
  origin_city: string;
  origin_state: string;

  // Destination information
  destination_city: string;
  destination_state: string;

  // Metrics (auto-calculated from load history)
  load_count: number;                  // Total loads on this lane
  average_rate_shipper: number;        // Average rate charged to shippers
  average_rate_carrier: number;        // Average rate paid to carriers
  average_margin: number;              // Average profit margin (shipper - carrier)

  // Trend analysis
  rate_trend: RateTrend;              // Direction of rate changes

  // Activity tracking
  last_load_date?: string;            // ISO datetime of most recent load

  // Metadata
  created_at: string;                  // ISO datetime when lane first appeared

  // Extended lane information
  distance_miles?: number;             // Distance between origin and destination
  average_transit_days?: number;      // Average days for delivery

  // Rate statistics
  min_rate_shipper?: number;          // Lowest rate charged to shipper
  max_rate_shipper?: number;          // Highest rate charged to shipper
  min_rate_carrier?: number;          // Lowest rate paid to carrier
  max_rate_carrier?: number;          // Highest rate paid to carrier
  rate_per_mile_shipper?: number;     // Average RPM to shipper
  rate_per_mile_carrier?: number;     // Average RPM to carrier

  // Margin statistics
  min_margin?: number;                // Lowest margin achieved
  max_margin?: number;                // Highest margin achieved
  margin_percentage?: number;         // Average margin as percentage
  total_margin?: number;              // Total profit from this lane
  average_margin_percentage?: number; // Alias for margin_percentage (used in some pages)

  // Additional statistics
  distance?: number;                  // Distance in miles
  total_revenue?: number;              // Total revenue generated
  average_rate?: number;               // Average overall rate
  min_rate?: number;                   // Minimum rate
  max_rate?: number;                   // Maximum rate

  // Volume metrics
  loads_last_7_days?: number;
  loads_last_30_days?: number;
  loads_last_90_days?: number;
  loads_last_365_days?: number;
  average_loads_per_month?: number;

  // Seasonal patterns
  busiest_month?: string;             // Month with most loads (1-12)
  slowest_month?: string;             // Month with least loads (1-12)
  seasonal_rate_variance?: number;    // Percentage difference between peak and low

  // Equipment breakdown
  equipment_distribution?: Array<{
    equipment_type: EquipmentType;
    count: number;
    percentage: number;
    average_rate: number;
  }>;

  // Commodity breakdown
  commodity_distribution?: Array<{
    commodity: string;
    count: number;
    percentage: number;
    average_weight: number;
  }>;

  // Top performers
  top_carriers?: Array<{
    carrier_id: string;
    carrier_name: string;
    load_count: number;
    average_rate: number;
    on_time_percentage: number;
  }>;

  top_shippers?: Array<{
    shipper_id: string;
    company_name: string;
    load_count: number;
    average_rate: number;
    total_revenue: number;
  }>;

  // Performance metrics
  on_time_pickup_percentage?: number;
  on_time_delivery_percentage?: number;
  average_detention_hours?: number;
  claim_percentage?: number;          // Percentage of loads with claims

  // Market data
  market_rate?: number;               // Current market rate (from DAT/Truckstop)
  market_rate_trend?: RateTrend;      // Market trend direction
  rate_vs_market?: number;            // Our rate vs market (percentage)
  capacity_status?: 'tight' | 'balanced' | 'loose';  // Current capacity situation

  // Forecasting
  projected_loads_next_30_days?: number;
  projected_rate_next_30_days?: number;
  demand_forecast?: 'increasing' | 'stable' | 'decreasing';

  // Special requirements common to this lane
  typical_requirements?: string[];     // ["Team drivers", "Tarps", "TWIC", etc.]
  typical_accessorials?: string[];    // ["Detention", "Lumper", etc.]

  // Geographic details
  origin_region?: string;             // e.g., "Southwest", "Northeast"
  destination_region?: string;
  is_headhaul?: boolean;             // Primary direction of freight flow
  backhaul_lane_id?: string;         // ID of reverse lane if applicable

  // Operational flags
  is_active?: boolean;                // Currently running loads on this lane
  is_contract_lane?: boolean;        // Has contract rates
  is_spot_lane?: boolean;            // Spot market only
  requires_special_equipment?: boolean;

  // Related data
  load_ids?: string[];                // All load IDs for this lane
  contract_ids?: string[];            // Contract IDs covering this lane
}

// Helper type for lane creation
export type CreateLaneInput = Omit<Lane,
  'id' |
  'created_at' |
  'load_count' |
  'average_rate_shipper' |
  'average_rate_carrier' |
  'average_margin' |
  'rate_trend'
> & {
  load_count?: number;
  average_rate_shipper?: number;
  average_rate_carrier?: number;
  average_margin?: number;
  rate_trend?: RateTrend;
};

// Helper type for lane updates
export type UpdateLaneInput = Partial<Omit<Lane, 'id' | 'organization_id' | 'created_at'>> & {
  id: string;
};

// Lane summary for list views
export interface LaneSummary {
  id: string;
  origin: string;                     // "City, ST" format
  destination: string;                 // "City, ST" format
  load_count: number;
  average_rate: number;
  average_margin: number;
  margin_percentage?: number;
  rate_trend: RateTrend;
  last_load_date?: string;
  loads_last_30_days?: number;
  is_active?: boolean;
}

// Lane analytics for detailed analysis
export interface LaneAnalytics {
  lane_id: string;
  origin: string;
  destination: string;

  // Rate analysis over time
  rate_history: Array<{
    date: string;
    average_rate_shipper: number;
    average_rate_carrier: number;
    load_count: number;
  }>;

  // Comparative analysis
  rate_percentile?: number;           // Where this lane ranks in profitability
  volume_percentile?: number;         // Where this lane ranks in volume

  // Profitability score (0-100)
  profitability_score?: number;

  // Recommendations
  recommended_rate_shipper?: number;
  recommended_rate_carrier?: number;
  rate_adjustment_suggestion?: 'increase' | 'maintain' | 'decrease';

  // Opportunity analysis
  untapped_potential?: number;        // Potential additional margin
  growth_opportunity?: 'high' | 'medium' | 'low';
}

// Lane comparison for competitive analysis
export interface LaneComparison {
  lane_id: string;
  your_rate: number;
  market_rate: number;
  competitor_rate?: number;
  rate_difference: number;
  rate_difference_percentage: number;
  competitiveness: 'below_market' | 'at_market' | 'above_market';
}

// Lane filters for search/filtering
export interface LaneFilters {
  origin_state?: string[];
  origin_city?: string[];
  destination_state?: string[];
  destination_city?: string[];
  min_load_count?: number;
  max_load_count?: number;
  min_average_rate?: number;
  max_average_rate?: number;
  min_margin?: number;
  max_margin?: number;
  rate_trend?: RateTrend[];
  is_active?: boolean;
  is_contract_lane?: boolean;
  last_load_from?: string;
  last_load_to?: string;
  distance_min?: number;
  distance_max?: number;
  equipment_types?: EquipmentType[];
  search_query?: string;             // Search across cities, states
}
