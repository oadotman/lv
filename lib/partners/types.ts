// =====================================================
// PARTNER PROGRAM TYPES AND INTERFACES
// Defines all types for the partner program system
// =====================================================

export type PartnerStatus = 'pending' | 'active' | 'inactive' | 'rejected' | 'suspended';
export type PartnerTier = 'standard' | 'premium';
export type PaymentMethod = 'paypal' | 'bank_transfer' | 'wise';
export type PartnerType = 'crm_consultant' | 'fractional_sales_leader' | 'sales_coach' | 'revops_consultant' | 'other';

export interface Partner {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  website?: string;
  phone?: string;
  partner_type: PartnerType;
  status: PartnerStatus;
  tier: PartnerTier;
  commission_rate: number; // 0.25 or 0.30
  referral_code: string;
  payment_method?: PaymentMethod;
  payment_details?: Record<string, any>;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  last_login_at?: string;
  metadata?: Record<string, any>;
}

export interface PartnerApplication {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  website?: string;
  phone?: string;
  partner_type: PartnerType;
  clients_per_year?: string;
  crms_used?: string[];
  how_heard?: string;
  why_partner?: string;
  has_used_loadvoice?: boolean;
  terms_accepted: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'more_info_needed';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface PartnerReferral {
  id: string;
  partner_id: string;
  customer_id?: string;
  customer_email: string;
  referral_code: string;
  status: 'clicked' | 'signed_up' | 'trial' | 'active' | 'churned' | 'refunded';
  clicked_at: string;
  signed_up_at?: string;
  converted_at?: string;
  churned_at?: string;
  subscription_id?: string;
  plan_name?: string;
  monthly_value?: number;
  metadata?: Record<string, any>;
}

export interface PartnerCommission {
  id: string;
  partner_id: string;
  referral_id: string;
  customer_id: string;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'reversed';
  month: string; // YYYY-MM
  subscription_payment_id?: string;
  calculated_at: string;
  approved_at?: string;
  paid_at?: string;
  reversed_at?: string;
  reversal_reason?: string;
  payout_id?: string;
}

export interface PartnerPayout {
  id: string;
  partner_id: string;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payment_method: PaymentMethod;
  payment_details?: Record<string, any>;
  period_start: string;
  period_end: string;
  commission_ids: string[];
  processed_at?: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  transaction_id?: string;
  notes?: string;
}

export interface PartnerClick {
  id: string;
  partner_id: string;
  referral_code: string;
  clicked_at: string;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  landing_page?: string;
  converted: boolean;
  converted_at?: string;
  customer_id?: string;
}

export interface PartnerStatistics {
  partner_id: string;
  total_clicks: number;
  total_signups: number;
  total_trials: number;
  total_customers: number;
  active_customers: number;
  churned_customers: number;
  total_revenue_generated: number;
  total_commission_earned: number;
  total_commission_paid: number;
  total_commission_pending: number;
  average_customer_value: number;
  conversion_rate: number;
  churn_rate: number;
  last_referral_at?: string;
  last_conversion_at?: string;
  current_month_earnings: number;
  last_month_earnings: number;
}

export interface PartnerSession {
  id: string;
  partner_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface PartnerCookie {
  partner_ref: string;
  timestamp: string;
  expires: string;
  source?: string;
  campaign?: string;
  coupon_code?: string;
}

// API Response Types
export interface PartnerDashboardData {
  partner: Partner;
  statistics: PartnerStatistics;
  recent_referrals: PartnerReferral[];
  recent_commissions: PartnerCommission[];
  next_payout?: PartnerPayout;
}

export interface PartnerApplicationResponse {
  success: boolean;
  application?: PartnerApplication;
  message?: string;
  errors?: Record<string, string>;
}

export interface PartnerLoginResponse {
  success: boolean;
  partner?: Partner;
  token?: string;
  message?: string;
}

export interface PartnerTrackingResponse {
  success: boolean;
  tracked: boolean;
  cookie_set: boolean;
  message?: string;
}

// Constants
export const PARTNER_COMMISSION_RATES = {
  standard: 0.25,
  premium: 0.30,
} as const;

export const PARTNER_TIER_THRESHOLDS = {
  premium: 10, // 10+ referrals for premium tier
} as const;

export const PARTNER_COOKIE_DURATION = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
export const PARTNER_COMMISSION_HOLD_PERIOD = 30; // 30 days
export const PARTNER_COMMISSION_DURATION_MONTHS = 12; // 12 months max per customer
export const PARTNER_MINIMUM_PAYOUT = 10000; // $100 in cents

// Validation
export const PARTNER_VALIDATION = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\+\(\)]+$/,
  website: /^https?:\/\/.+\..+/,
  company_name: {
    min: 2,
    max: 100,
  },
  full_name: {
    min: 2,
    max: 100,
  },
  why_partner: {
    min: 10,
    max: 500,
  },
} as const;