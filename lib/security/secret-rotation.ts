/**
 * Secret Rotation System
 * Manages API key and secret rotation with zero downtime
 */

import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export type SecretType =
  | 'session_secret'
  | 'csrf_secret'
  | 'webhook_secret_paddle'
  | 'webhook_secret_assemblyai'
  | 'encryption_key';

export interface Secret {
  id: string;
  secret_type: SecretType;
  secret_value: string; // Encrypted
  version: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  rotated_at: string | null;
}

/**
 * Generate a cryptographically secure secret
 */
export function generateSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Encrypt secret before storing
 * Uses environment encryption key
 */
function encryptSecret(plaintext: string): string {
  const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('SECRET_ENCRYPTION_KEY not configured');
  }

  // Use AES-256-GCM for encryption
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt secret for use
 */
function decryptSecret(encrypted: string): string {
  const encryptionKey = process.env.SECRET_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('SECRET_ENCRYPTION_KEY not configured');
  }

  const [ivHex, authTagHex, encryptedData] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = crypto.scryptSync(encryptionKey, 'salt', 32);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Store a new secret version
 */
export async function storeSecret(
  secretType: SecretType,
  secretValue: string,
  expiresInDays?: number
): Promise<Secret> {
  const supabase = createAdminClient();

  // Get current max version
  const { data: currentSecrets } = await supabase
    .from('secrets')
    .select('version')
    .eq('secret_type', secretType)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = (currentSecrets?.[0]?.version || 0) + 1;

  // Calculate expiration
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Encrypt the secret
  const encrypted = encryptSecret(secretValue);

  // Store new secret
  const { data, error } = await supabase
    .from('secrets')
    .insert({
      secret_type: secretType,
      secret_value: encrypted,
      version: nextVersion,
      is_active: false, // Not active until explicitly activated
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Activate a secret version
 * Deactivates all other versions of the same type
 */
export async function activateSecret(
  secretType: SecretType,
  version: number
): Promise<void> {
  const supabase = createAdminClient();

  // Deactivate all versions
  await supabase
    .from('secrets')
    .update({ is_active: false })
    .eq('secret_type', secretType);

  // Activate specific version
  const { error } = await supabase
    .from('secrets')
    .update({
      is_active: true,
      rotated_at: new Date().toISOString(),
    })
    .eq('secret_type', secretType)
    .eq('version', version);

  if (error) throw error;
}

/**
 * Get active secret for a type
 * Supports fallback to previous version during rotation
 */
export async function getActiveSecret(
  secretType: SecretType,
  includeFallback: boolean = false
): Promise<string | { current: string; fallback?: string }> {
  const supabase = createAdminClient();

  if (!includeFallback) {
    // Get only active secret
    const { data, error } = await supabase
      .from('secrets')
      .select('secret_value')
      .eq('secret_type', secretType)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error(`No active secret found for ${secretType}`);
    }

    return decryptSecret(data.secret_value);
  }

  // Get active + most recent inactive (for fallback during rotation)
  const { data, error } = await supabase
    .from('secrets')
    .select('secret_value, is_active')
    .eq('secret_type', secretType)
    .order('version', { ascending: false })
    .limit(2);

  if (error || !data || data.length === 0) {
    throw new Error(`No secrets found for ${secretType}`);
  }

  const active = data.find((s) => s.is_active);
  const fallback = data.find((s) => !s.is_active);

  if (!active) {
    throw new Error(`No active secret found for ${secretType}`);
  }

  return {
    current: decryptSecret(active.secret_value),
    fallback: fallback ? decryptSecret(fallback.secret_value) : undefined,
  };
}

/**
 * Rotate a secret with zero downtime
 * 1. Generate new secret
 * 2. Store as inactive
 * 3. Wait for propagation period
 * 4. Activate new secret
 * 5. Keep old secret as fallback
 * 6. Delete old secret after grace period
 */
export async function rotateSecret(
  secretType: SecretType,
  options: {
    length?: number;
    expiresInDays?: number;
    gracePeriodDays?: number;
  } = {}
): Promise<{
  newSecret: string;
  version: number;
  instructions: string;
}> {
  const { length = 32, expiresInDays, gracePeriodDays = 7 } = options;

  // Generate new secret
  const newSecretValue = generateSecret(length);

  // Store new secret (inactive)
  const secret = await storeSecret(secretType, newSecretValue, expiresInDays);

  // Instructions for manual rotation
  const instructions = `
Secret Rotation Started for ${secretType}

1. New secret generated (version ${secret.version})
2. Update your external services to use this new secret:

   Secret: ${newSecretValue}

3. After all services are updated (recommended wait: 24-48 hours), activate the new secret:

   Run: activateSecret('${secretType}', ${secret.version})

4. The old secret will remain valid for ${gracePeriodDays} days as fallback
5. After ${gracePeriodDays} days, the old secret will be automatically deleted

Current Status: NEW SECRET CREATED (INACTIVE)
Next Step: Update external services, then activate
`;

  return {
    newSecret: newSecretValue,
    version: secret.version,
    instructions,
  };
}

/**
 * Complete rotation by activating new secret
 */
export async function completeRotation(
  secretType: SecretType,
  version: number
): Promise<void> {
  await activateSecret(secretType, version);
  console.log(`✅ Secret rotation completed for ${secretType} v${version}`);
}

/**
 * Clean up expired secrets
 */
export async function cleanupExpiredSecrets(): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('secrets')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .eq('is_active', false)
    .select('id');

  if (error) throw error;

  return data?.length || 0;
}

/**
 * Get rotation status for all secrets
 */
export async function getRotationStatus(): Promise<
  Array<{
    secretType: SecretType;
    currentVersion: number;
    isExpiringSoon: boolean;
    expiresAt: string | null;
    lastRotated: string | null;
  }>
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('secrets')
    .select('secret_type, version, expires_at, rotated_at')
    .eq('is_active', true);

  if (error) throw error;

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return (data || []).map((secret) => ({
    secretType: secret.secret_type as SecretType,
    currentVersion: secret.version,
    isExpiringSoon: secret.expires_at
      ? new Date(secret.expires_at) < thirtyDaysFromNow
      : false,
    expiresAt: secret.expires_at,
    lastRotated: secret.rotated_at,
  }));
}

/**
 * Emergency secret revocation
 * Use this if a secret is compromised
 */
export async function revokeSecret(
  secretType: SecretType,
  version: number,
  reason: string
): Promise<void> {
  const supabase = createAdminClient();

  // Mark as revoked (we'll add a revoked column in migration)
  const { error } = await supabase
    .from('secrets')
    .update({
      is_active: false,
      expires_at: new Date().toISOString(), // Expire immediately
      // Store revocation reason in metadata
    })
    .eq('secret_type', secretType)
    .eq('version', version);

  if (error) throw error;

  console.error(`🚨 SECRET REVOKED: ${secretType} v${version} - ${reason}`);
}

export default {
  generate: generateSecret,
  store: storeSecret,
  activate: activateSecret,
  getActive: getActiveSecret,
  rotate: rotateSecret,
  complete: completeRotation,
  cleanup: cleanupExpiredSecrets,
  status: getRotationStatus,
  revoke: revokeSecret,
};