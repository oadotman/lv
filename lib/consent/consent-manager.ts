// =====================================================
// CONSENT MANAGEMENT SYSTEM
// GDPR Article 7 - User consent tracking and management
// =====================================================

import { createServerClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/logging/audit-logger';

export type ConsentType =
  | 'terms_of_service'
  | 'privacy_policy'
  | 'marketing_emails'
  | 'analytics'
  | 'data_processing';

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  consentGiven: boolean;
  consentVersion: string;
  consentedAt?: string;
  revokedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Current consent versions (update when privacy policy/terms change)
 */
export const CONSENT_VERSIONS = {
  TERMS_OF_SERVICE: '1.0.0',
  PRIVACY_POLICY: '1.0.0',
  MARKETING_EMAILS: '1.0.0',
  ANALYTICS: '1.0.0',
  DATA_PROCESSING: '1.0.0',
};

/**
 * Give consent for a specific type
 */
export async function giveConsent(
  userId: string,
  consentType: ConsentType,
  ipAddress?: string,
  userAgent?: string
): Promise<ConsentRecord> {
  const supabase = createServerClient();

  const version = getConsentVersion(consentType);

  const { data, error } = await supabase
    .from('user_consents')
    .upsert(
      {
        user_id: userId,
        consent_type: consentType,
        consent_given: true,
        consent_version: version,
        consented_at: new Date().toISOString(),
        revoked_at: null,
        ip_address: ipAddress,
        user_agent: userAgent,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,consent_type',
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record consent: ${error.message}`);
  }

  // Log consent given
  await logAuditEvent({
    userId,
    action: 'consent_given',
    resourceType: 'consent',
    resourceId: consentType,
    metadata: {
      consentType,
      version,
    },
    ipAddress,
    userAgent,
  });

  return data as ConsentRecord;
}

/**
 * Revoke consent for a specific type
 */
export async function revokeConsent(
  userId: string,
  consentType: ConsentType,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('user_consents')
    .update({
      consent_given: false,
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('consent_type', consentType);

  if (error) {
    throw new Error(`Failed to revoke consent: ${error.message}`);
  }

  // Log consent revoked
  await logAuditEvent({
    userId,
    action: 'consent_revoked',
    resourceType: 'consent',
    resourceId: consentType,
    metadata: {
      consentType,
    },
    ipAddress,
    userAgent,
  });
}

/**
 * Check if user has given consent for a specific type
 */
export async function hasConsent(
  userId: string,
  consentType: ConsentType,
  requireLatestVersion: boolean = true
): Promise<boolean> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('user_consents')
    .select('*')
    .eq('user_id', userId)
    .eq('consent_type', consentType)
    .eq('consent_given', true)
    .single();

  if (error || !data) {
    return false;
  }

  // Check if consent is for latest version
  if (requireLatestVersion) {
    const latestVersion = getConsentVersion(consentType);
    return data.consent_version === latestVersion;
  }

  return true;
}

/**
 * Get all consents for a user
 */
export async function getUserConsents(userId: string): Promise<ConsentRecord[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('user_consents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch consents: ${error.message}`);
  }

  return data as ConsentRecord[];
}

/**
 * Get consent status for all types
 */
export async function getConsentStatus(userId: string): Promise<
  Record<ConsentType, {
    given: boolean;
    version?: string;
    consentedAt?: string;
    needsUpdate: boolean;
  }>
> {
  const consents = await getUserConsents(userId);

  const status: any = {
    terms_of_service: { given: false, needsUpdate: true },
    privacy_policy: { given: false, needsUpdate: true },
    marketing_emails: { given: false, needsUpdate: false },
    analytics: { given: false, needsUpdate: false },
    data_processing: { given: false, needsUpdate: true },
  };

  for (const consent of consents) {
    const consentType = (consent as any).consent_type as ConsentType;
    const latestVersion = getConsentVersion(consentType);
    status[consentType] = {
      given: (consent as any).consent_given,
      version: (consent as any).consent_version,
      consentedAt: (consent as any).consented_at,
      needsUpdate:
        (consent as any).consent_given && (consent as any).consent_version !== latestVersion,
    };
  }

  return status;
}

/**
 * Require specific consent (throw error if not given)
 */
export async function requireConsent(
  userId: string,
  consentType: ConsentType
): Promise<void> {
  const hasUserConsent = await hasConsent(userId, consentType);

  if (!hasUserConsent) {
    throw new Error(
      `User must consent to ${consentType.replace('_', ' ')} to perform this action`
    );
  }
}

/**
 * Get consent version for a type
 */
function getConsentVersion(consentType: ConsentType): string {
  switch (consentType) {
    case 'terms_of_service':
      return CONSENT_VERSIONS.TERMS_OF_SERVICE;
    case 'privacy_policy':
      return CONSENT_VERSIONS.PRIVACY_POLICY;
    case 'marketing_emails':
      return CONSENT_VERSIONS.MARKETING_EMAILS;
    case 'analytics':
      return CONSENT_VERSIONS.ANALYTICS;
    case 'data_processing':
      return CONSENT_VERSIONS.DATA_PROCESSING;
    default:
      return '1.0.0';
  }
}

/**
 * Record consent during signup
 */
export async function recordSignupConsents(
  userId: string,
  consents: Partial<Record<ConsentType, boolean>>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Required consents
  const requiredConsents: ConsentType[] = [
    'terms_of_service',
    'privacy_policy',
    'data_processing',
  ];

  for (const consentType of requiredConsents) {
    if (!consents[consentType]) {
      throw new Error(`${consentType} consent is required`);
    }
    await giveConsent(userId, consentType, ipAddress, userAgent);
  }

  // Optional consents
  const optionalConsents: ConsentType[] = ['marketing_emails', 'analytics'];

  for (const consentType of optionalConsents) {
    if (consents[consentType]) {
      await giveConsent(userId, consentType, ipAddress, userAgent);
    }
  }
}

/**
 * Check if user needs to update any consents
 */
export async function needsConsentUpdate(userId: string): Promise<boolean> {
  const status = await getConsentStatus(userId);

  return Object.values(status).some((s) => s.needsUpdate);
}
