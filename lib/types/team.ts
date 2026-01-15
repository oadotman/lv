// =====================================================
// TEAM TYPES - Value-Adding Team Structure
// =====================================================

export type UserRole = 'owner' | 'admin' | 'member';
export type PhoneAssignmentType = 'personal' | 'shared';
export type PhoneNumberStatus = 'active' | 'inactive' | 'deleted';
export type CallVisibility = 'team' | 'personal';
export type InteractionType = 'call' | 'email' | 'note' | 'rate_update';

// =====================================================
// Core Team Entities
// =====================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan_type: string;
  max_members: number;
  max_minutes_monthly: number;
  created_at: string;
  updated_at: string;

  // LoadVoice specific
  product_type?: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  company_zip?: string;
  mc_number?: string;
  dot_number?: string;
  logo_url?: string;
  rate_con_terms?: string;
  default_payment_terms?: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  joined_at: string;

  // Joined data
  profile?: UserProfile;
  usage_stats?: TeamMemberUsage;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Phone Number Management
// =====================================================

export interface PhoneNumber {
  id: string;
  organization_id: string;
  phone_number: string;
  friendly_name?: string;
  phone_number_sid: string;

  // Assignment
  assignment_type: PhoneAssignmentType;
  assigned_to?: string; // User ID, null for shared
  assigned_by: string; // Admin who assigned
  assigned_at: string;

  // Status
  status: PhoneNumberStatus;

  // Twilio configuration
  voice_url?: string;
  voice_method?: string;
  sms_url?: string;
  sms_method?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  deleted_at?: string;

  // Joined data
  assigned_to_profile?: UserProfile;
  assigned_by_profile?: UserProfile;
}

export interface PhoneNumberAssignment {
  phone_number_id: string;
  user_id: string;
  assignment_type: PhoneAssignmentType;
}

// =====================================================
// Shared Carrier Database
// =====================================================

export interface TeamCarrier {
  // All carrier fields from existing type
  id: string;
  organization_id: string;
  carrier_name: string;
  mc_number?: string;
  dot_number?: string;
  contact_name?: string;
  phone_number?: string;
  email?: string;
  preferred?: boolean;
  insurance_on_file?: boolean;
  notes?: string;

  // Team tracking
  created_by?: string;
  updated_by?: string;
  last_contact_date?: string;
  last_contact_by?: string;

  // Joined data for team view
  created_by_name?: string;
  updated_by_name?: string;
  last_contact_by_name?: string;
  total_interactions?: number;
  recent_interactions?: CarrierInteraction[];
}

export interface CarrierInteraction {
  id: string;
  organization_id: string;
  carrier_id: string;
  call_id?: string;

  // Interaction details
  interaction_type: InteractionType;
  type?: string; // Alias for interaction_type for display
  interaction_date: string;
  date?: string; // Alias for interaction_date for display
  user_id: string;

  // Content
  notes?: string;
  rate_discussed?: number;
  lane_discussed?: string;

  // Metadata
  created_at: string;

  // Joined data
  user_name?: string;
  user_email?: string;
}

// =====================================================
// Shared Call Visibility
// =====================================================

export interface TeamCall {
  // Existing call fields
  id: string;
  organization_id: string;
  user_id: string;
  created_at: string;
  duration?: number;
  status?: string;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  direction?: 'inbound' | 'outbound';
  recording_url?: string;
  extracted_info?: {
    carrier_name?: string;
    shipper_name?: string;
    [key: string]: any;
  };

  // Team features
  visibility: CallVisibility;
  phone_number_id?: string;

  // Joined data for team view
  user_name?: string;
  user_email?: string;
  from_number?: string;
  number_name?: string;
  assignment_type?: PhoneAssignmentType;
}

// =====================================================
// Team Usage Tracking
// =====================================================

export interface TeamMemberUsage {
  user_id: string;
  user_name?: string;
  user_email?: string;
  month: string;

  // Usage metrics
  total_minutes: number;
  total_calls: number;

  // Breakdown by number
  number_usage?: PhoneNumberUsage[];
}

export interface PhoneNumberUsage {
  phone_number_id: string;
  phone_number: string;
  friendly_name?: string;
  minutes_used: number;
  calls_made: number;
}

export interface AdminUsageView {
  organization_id: string;
  month: string;

  // Total team usage
  total_team_minutes: number;
  total_team_calls: number;

  // Per member breakdown
  member_usage: TeamMemberUsage[];

  // Per number breakdown
  number_usage: PhoneNumberUsage[];
}

// =====================================================
// Admin Dashboard Data
// =====================================================

export interface AdminDashboard {
  organization: Organization;

  // Team overview
  total_members: number;
  active_members: number;

  // Phone numbers
  total_numbers: number;
  active_numbers: number;
  numbers: PhoneNumber[];

  // Usage this month
  usage_summary: AdminUsageView;

  // Billing
  current_plan: string;
  minutes_used: number;
  minutes_limit: number;
  overage_minutes?: number;
}

// =====================================================
// Team Member Dashboard Data
// =====================================================

export interface MemberDashboard {
  organization: Organization;
  my_role: UserRole;

  // My numbers
  assigned_numbers: PhoneNumber[];

  // My calls
  my_recent_calls: TeamCall[];

  // Team calls (if enabled)
  team_recent_calls: TeamCall[];

  // Shared carriers
  recent_carriers: TeamCarrier[];

  // My usage
  my_usage: TeamMemberUsage;
}

// =====================================================
// API Request/Response Types
// =====================================================

export interface AssignPhoneNumberRequest {
  phone_number_id: string;
  user_id?: string; // Optional, null for shared
  assignment_type: PhoneAssignmentType;
}

export interface ProvisionPhoneNumberRequest {
  area_code?: string;
  friendly_name: string;
  assignment_type: PhoneAssignmentType;
  assigned_to?: string; // User ID if personal
}

export interface UpdatePhoneNumberRequest {
  friendly_name?: string;
  status?: PhoneNumberStatus;
  assigned_to?: string;
  assignment_type?: PhoneAssignmentType;
}

export interface RecordCarrierInteractionRequest {
  carrier_id: string;
  call_id?: string;
  interaction_type: InteractionType;
  notes?: string;
  rate_discussed?: number;
  lane_discussed?: string;
}

// =====================================================
// Permissions Helper Types
// =====================================================

export interface TeamPermissions {
  can_provision_numbers: boolean;
  can_manage_numbers: boolean;
  can_view_billing: boolean;
  can_manage_team: boolean;
  can_view_all_calls: boolean;
  can_view_all_carriers: boolean;
}

export function getUserPermissions(role: UserRole): TeamPermissions {
  switch (role) {
    case 'owner':
    case 'admin':
      return {
        can_provision_numbers: true,
        can_manage_numbers: true,
        can_view_billing: true,
        can_manage_team: true,
        can_view_all_calls: true,
        can_view_all_carriers: true,
      };
    case 'member':
      return {
        can_provision_numbers: false,
        can_manage_numbers: false,
        can_view_billing: false,
        can_manage_team: false,
        can_view_all_calls: true,
        can_view_all_carriers: true,
      };
    default:
      return {
        can_provision_numbers: false,
        can_manage_numbers: false,
        can_view_billing: false,
        can_manage_team: false,
        can_view_all_calls: false,
        can_view_all_carriers: false,
      };
  }
}