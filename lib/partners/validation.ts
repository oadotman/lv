// =====================================================
// PARTNER VALIDATION UTILITIES
// Validation functions for partner program
// =====================================================

import type { PartnerApplication } from './types';

export class PartnerValidation {
  /**
   * Validate partner application data
   */
  static validateApplication(data: Partial<PartnerApplication>): {
    valid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};

    // Required fields
    if (!data.full_name?.trim()) {
      errors.full_name = 'Full name is required';
    } else if (data.full_name.length < 2 || data.full_name.length > 100) {
      errors.full_name = 'Full name must be between 2 and 100 characters';
    }

    if (!data.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Invalid email format';
    }

    if (!data.partner_type) {
      errors.partner_type = 'Partner type is required';
    } else if (!['crm_consultant', 'fractional_sales_leader', 'sales_coach', 'revops_consultant', 'other'].includes(data.partner_type)) {
      errors.partner_type = 'Invalid partner type';
    }

    if (!data.why_partner?.trim()) {
      errors.why_partner = 'Please explain why you want to become a partner';
    } else if (data.why_partner.length < 10 || data.why_partner.length > 500) {
      errors.why_partner = 'Explanation must be between 10 and 500 characters';
    }

    if (!data.terms_accepted) {
      errors.terms_accepted = 'You must accept the terms and conditions';
    }

    // Optional fields validation
    if (data.phone && !/^[\d\s\-\+\(\)]+$/.test(data.phone)) {
      errors.phone = 'Invalid phone number format';
    }

    if (data.website && !/^https?:\/\/.+\..+/.test(data.website)) {
      errors.website = 'Invalid website URL format';
    }

    if (data.company_name && (data.company_name.length < 2 || data.company_name.length > 100)) {
      errors.company_name = 'Company name must be between 2 and 100 characters';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Validate partner referral code
   */
  static validateReferralCode(code: string): boolean {
    // Referral codes should be alphanumeric, 6-20 characters
    const pattern = /^[a-zA-Z0-9]{6,20}$/;
    return pattern.test(code);
  }

  /**
   * Validate payment details based on method
   */
  static validatePaymentDetails(method: string, details: Record<string, any>): {
    valid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};

    switch (method) {
      case 'paypal':
        if (!details.email) {
          errors.email = 'PayPal email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
          errors.email = 'Invalid PayPal email format';
        }
        break;

      case 'bank_transfer':
        if (!details.account_holder) {
          errors.account_holder = 'Account holder name is required';
        }
        if (!details.account_number) {
          errors.account_number = 'Account number is required';
        }
        if (!details.routing_number && !details.iban) {
          errors.routing = 'Routing number or IBAN is required';
        }
        break;

      case 'wise':
        if (!details.email) {
          errors.email = 'Wise email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
          errors.email = 'Invalid Wise email format';
        }
        break;

      default:
        errors.method = 'Invalid payment method';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Sanitize partner input
   */
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/[<>]/g, '');
  }

  /**
   * Generate a unique partner code
   */
  static generatePartnerCode(name: string): string {
    // Remove spaces and special characters
    const cleanName = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 10);

    // Add random suffix
    const randomSuffix = Math.random().toString(36).substring(2, 6);

    return `${cleanName}${randomSuffix}`;
  }

  /**
   * Validate commission rate
   */
  static validateCommissionRate(rate: number): boolean {
    return rate >= 0 && rate <= 1; // 0-100% as decimal
  }

  /**
   * Check if email is from a disposable domain
   */
  static isDisposableEmail(email: string): boolean {
    // Common disposable email domains (expand as needed)
    const disposableDomains = [
      'tempmail.com',
      'throwaway.email',
      'guerrillamail.com',
      'mailinator.com',
      '10minutemail.com',
      'trashmail.com',
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    return disposableDomains.some(d => domain?.includes(d));
  }

  /**
   * Validate partner tier eligibility
   */
  static isEligibleForPremiumTier(referralCount: number): boolean {
    return referralCount >= 10;
  }

  /**
   * Calculate commission amount
   */
  static calculateCommission(
    monthlyValue: number,
    commissionRate: number,
    monthsSinceStart: number
  ): number {
    // Commission only for first 12 months
    if (monthsSinceStart >= 12) {
      return 0;
    }

    return Math.round(monthlyValue * commissionRate * 100) / 100;
  }

  /**
   * Check if payout threshold is met
   */
  static meetsPayoutThreshold(amount: number, threshold: number = 10000): boolean {
    return amount >= threshold; // Default $100 in cents
  }
}