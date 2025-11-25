// =====================================================
// PRICING MODEL CONSTANTS
// Must stay in sync with database/008_team_management.sql
// =====================================================

export type PlanType = 'free' | 'solo' | 'team_5' | 'team_10' | 'team_20' | 'enterprise';

export interface PlanDetails {
  id: PlanType;
  name: string;
  price: number;           // Monthly price in dollars
  priceAnnual: number;     // Annual price in dollars (with 17% discount)
  priceDisplay: string;    // Display string like "$49/mo"
  maxMembers: number;
  maxMinutes: number;
  perUserCost: number;     // Cost per user in dollars
  features: string[];
  isPopular?: boolean;
  cta: string;            // Call to action button text
}

// Overage pricing
export const OVERAGE_RATE = 0.02; // $0.02 per minute over limit
export const ANNUAL_DISCOUNT = 0.17; // 17% discount (2 months free)

// Plan configurations
export const PLANS: Record<PlanType, PlanDetails> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceAnnual: 0,
    priceDisplay: '$0',
    maxMembers: 1,
    maxMinutes: 30,
    perUserCost: 0,
    features: [
      '30 minutes/month',
      '1 user',
      'Basic transcription',
      'CRM output formats',
      'Email support',
    ],
    cta: 'Get Started',
  },
  solo: {
    id: 'solo',
    name: 'Solo',
    price: 49,
    priceAnnual: 488, // $49 * 12 * 0.83
    priceDisplay: '$49/mo',
    maxMembers: 1,
    maxMinutes: 1500,
    perUserCost: 49,
    features: [
      '1,500 minutes/month',
      '1 user',
      'Advanced transcription',
      'Speaker diarization',
      'All CRM formats',
      'Custom templates',
      'Priority email support',
      'Overage billing at $0.02/min',
    ],
    cta: 'Start Free Trial',
  },
  team_5: {
    id: 'team_5',
    name: 'Team 5',
    price: 149,
    priceAnnual: 1484, // $149 * 12 * 0.83
    priceDisplay: '$149/mo',
    maxMembers: 5,
    maxMinutes: 6000,
    perUserCost: 29.8,
    features: [
      '6,000 minutes/month',
      '5 named users',
      'Team collaboration',
      'Shared templates',
      'Usage analytics',
      'API access',
      'Priority support',
      'Overage billing at $0.02/min',
    ],
    isPopular: true,
    cta: 'Start Free Trial',
  },
  team_10: {
    id: 'team_10',
    name: 'Team 10',
    price: 299,
    priceAnnual: 2978, // $299 * 12 * 0.83
    priceDisplay: '$299/mo',
    maxMembers: 10,
    maxMinutes: 15000,
    perUserCost: 29.9,
    features: [
      '15,000 minutes/month',
      '10 named users',
      'Advanced team features',
      'Custom integrations',
      'Dedicated support',
      'Onboarding assistance',
      'Overage billing at $0.02/min',
    ],
    cta: 'Start Free Trial',
  },
  team_20: {
    id: 'team_20',
    name: 'Team 20',
    price: 499,
    priceAnnual: 4968, // $499 * 12 * 0.83
    priceDisplay: '$499/mo',
    maxMembers: 20,
    maxMinutes: 35000,
    perUserCost: 24.95,
    features: [
      '35,000 minutes/month',
      '20 named users',
      'Enterprise features',
      'SSO (coming soon)',
      'Advanced analytics',
      'White-label options',
      'Dedicated account manager',
      'Overage billing at $0.02/min',
    ],
    cta: 'Start Free Trial',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0, // Custom pricing
    priceAnnual: 0,
    priceDisplay: 'Custom',
    maxMembers: 999,
    maxMinutes: 999999,
    perUserCost: 0,
    features: [
      'Unlimited minutes',
      'Unlimited users',
      'Custom contracts',
      'SLA guarantees',
      'Dedicated infrastructure',
      'Custom integrations',
      'White-label',
      '24/7 phone support',
    ],
    cta: 'Contact Sales',
  },
};

// Helper to get plan details
export function getPlanDetails(planType: PlanType): PlanDetails {
  return PLANS[planType];
}

// Helper to format price
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Helper to format minutes
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${mins} min`;
}

// Calculate overage cost
export function calculateOverageCost(minutesUsed: number, planType: PlanType): number {
  const plan = getPlanDetails(planType);
  const overageMinutes = Math.max(0, minutesUsed - plan.maxMinutes);
  return overageMinutes * OVERAGE_RATE;
}

// Calculate annual savings
export function calculateAnnualSavings(planType: PlanType): number {
  const plan = getPlanDetails(planType);
  if (plan.price === 0) return 0;

  const monthlyTotal = plan.price * 12;
  const annualPrice = plan.priceAnnual;
  return monthlyTotal - annualPrice;
}

// Check if user can upgrade to plan
export function canUpgradeToPlan(
  currentPlan: PlanType,
  targetPlan: PlanType,
  currentMembers: number
): { canUpgrade: boolean; reason?: string } {
  const target = getPlanDetails(targetPlan);

  if (currentMembers > target.maxMembers) {
    return {
      canUpgrade: false,
      reason: `Your team has ${currentMembers} members, but ${target.name} only supports ${target.maxMembers} members. Please remove some team members first.`,
    };
  }

  return { canUpgrade: true };
}

// Get recommended plan based on usage
export function getRecommendedPlan(
  minutesUsed: number,
  teamSize: number
): PlanType {
  // If solo user
  if (teamSize === 1) {
    if (minutesUsed <= 30) return 'free';
    if (minutesUsed <= 1500) return 'solo';
    return 'team_5'; // Suggest team plan if solo user needs more
  }

  // For teams
  if (teamSize <= 5) {
    if (minutesUsed <= 6000) return 'team_5';
    if (minutesUsed <= 15000) return 'team_10';
    return 'team_20';
  }

  if (teamSize <= 10) {
    if (minutesUsed <= 15000) return 'team_10';
    return 'team_20';
  }

  if (teamSize <= 20) {
    return 'team_20';
  }

  return 'enterprise';
}

// Get all available plans for pricing page
export function getPublicPlans(): PlanDetails[] {
  return [
    PLANS.free,
    PLANS.solo,
    PLANS.team_5,
    PLANS.team_10,
    PLANS.team_20,
  ];
}

// Usage alert thresholds
export const USAGE_ALERTS = {
  WARNING: 0.8,  // 80% of quota
  CRITICAL: 0.95, // 95% of quota
};

// Check usage status
export function getUsageStatus(
  minutesUsed: number,
  planType: PlanType
): { status: 'ok' | 'warning' | 'critical' | 'overage'; percentage: number } {
  const plan = getPlanDetails(planType);
  const percentage = (minutesUsed / plan.maxMinutes) * 100;

  if (percentage >= 100) {
    return { status: 'overage', percentage };
  }
  if (percentage >= USAGE_ALERTS.CRITICAL * 100) {
    return { status: 'critical', percentage };
  }
  if (percentage >= USAGE_ALERTS.WARNING * 100) {
    return { status: 'warning', percentage };
  }
  return { status: 'ok', percentage };
}
