// =====================================================
// LOADVOICE PRICING MODEL
// Freight broker focused pricing tiers
// =====================================================

export type PlanType = 'free' | 'solo' | 'starter' | 'professional' | 'enterprise' | 'custom';

export interface PlanDetails {
  id: PlanType;
  name: string;
  price: number;           // Monthly price in dollars
  priceAnnual: number;     // Annual price in dollars (with 17% discount)
  priceDisplay: string;    // Display string like "$99/mo"
  maxMembers: number;
  maxMinutes: number;      // Call minutes per month
  perUserCost: number;     // Cost per user in dollars
  features: string[];
  isPopular?: boolean;
  cta: string;            // Call to action button text
}

// Simple flat overage pricing - $0.20 per minute for everyone
export const OVERAGE_RATE = 0.20; // $0.20 per minute over limit (flat rate)
export const ANNUAL_DISCOUNT = 0.17; // 17% discount (2 months free)

// Simple LoadVoice Plan configurations
export const PLANS: Record<PlanType, PlanDetails> = {
  free: {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    priceAnnual: 0,
    priceDisplay: '$0',
    maxMembers: 1,
    maxMinutes: 60,
    perUserCost: 0,
    features: [
      '60 minutes free every month',
      '1 user',
      'Carrier vetting (FMCSA)',
      'One-click rate confirmations',
      'Email support',
    ],
    cta: 'Start Free Trial',
  },
  solo: {
    id: 'solo',
    name: 'Solo',
    price: 99,
    priceAnnual: 986, // $99 * 12 * 0.83
    priceDisplay: '$99/mo',
    maxMembers: 1,
    maxMinutes: 500,
    perUserCost: 99,
    features: [
      '500 minutes/month',
      '1 user',
      'All core features',
      'Email & chat support',
      'Overage: $0.20/min',
    ],
    cta: 'Start Now',
  },
  starter: {
    id: 'starter',
    name: 'Team',
    price: 199,
    priceAnnual: 1982, // $199 * 12 * 0.83
    priceDisplay: '$199/mo',
    maxMembers: 3,
    maxMinutes: 1500,
    perUserCost: 66.3,
    features: [
      '1,500 minutes/month',
      '3 users',
      'Everything in Solo',
      'Team features',
      'Priority support',
      'Overage: $0.20/min',
    ],
    isPopular: true,
    cta: 'Get Team',
  },
  professional: {
    id: 'professional',
    name: 'Growing',
    price: 349,
    priceAnnual: 3476, // $349 * 12 * 0.83
    priceDisplay: '$349/mo',
    maxMembers: 10,
    maxMinutes: 4000,
    perUserCost: 34.9,
    features: [
      '4,000 minutes/month',
      '10 users',
      'Everything in Team',
      'Advanced features',
      'API access',
      'Dedicated support',
      'Overage: $0.20/min',
    ],
    cta: 'Get Growing',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999,
    priceAnnual: 9940, // $999 * 12 * 0.83
    priceDisplay: '$999/mo',
    maxMembers: 20,
    maxMinutes: 15000,
    perUserCost: 49.95,
    features: [
      '15,000 minutes/month',
      '20 users',
      'Everything in Growing',
      'Custom workflows',
      'Dedicated success manager',
      'Custom integrations',
      'White-label options',
      'API access',
      'Overage: $0.20/min',
    ],
    cta: 'Contact Sales',
  },
  custom: {
    id: 'custom',
    name: 'Custom',
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
      'Custom AI training',
      'White-label solution',
      '24/7 phone support',
      'On-premise deployment',
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
    return 'starter'; // Suggest team plan if solo user needs more
  }

  // For teams
  if (teamSize <= 5) {
    if (minutesUsed <= 6000) return 'starter';
    if (minutesUsed <= 15000) return 'professional';
    return 'enterprise';
  }

  if (teamSize <= 10) {
    if (minutesUsed <= 15000) return 'professional';
    return 'enterprise';
  }

  if (teamSize <= 20) {
    return 'enterprise';
  }

  return 'custom';
}

// Get all available plans for pricing page
export function getPublicPlans(): PlanDetails[] {
  return [
    PLANS.free,
    PLANS.solo,
    PLANS.starter,
    PLANS.professional,
    PLANS.enterprise,
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
