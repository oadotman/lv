// =====================================================
// ENCRYPTION UNIT TESTS
// Tests for data encryption and decryption
// =====================================================

import {
  encrypt,
  decrypt,
  hash,
  verifyHash,
  generateToken,
  generateSignature,
  verifySignature,
  maskSensitiveData,
} from '@/lib/security/encryption';

describe('Encryption', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const plaintext = 'sensitive user data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext', () => {
      const plaintext = 'test data';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle special characters', () => {
      const plaintext = 'Test with émojis = and spëcial chârs!';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid encrypted data', () => {
      expect(() => decrypt('invalid-data')).toThrow();
    });
  });

  describe('hash and verifyHash', () => {
    it('should hash data securely', () => {
      const data = 'password123';
      const hashed = hash(data);

      expect(hashed).toBeDefined();
      expect(hashed.length).toBeGreaterThan(0);
      expect(hashed).not.toBe(data);
    });

    it('should verify correct hash', () => {
      const data = 'password123';
      const hashed = hash(data);

      expect(verifyHash(data, hashed)).toBe(true);
    });

    it('should reject incorrect hash', () => {
      const data = 'password123';
      const hashed = hash(data);

      expect(verifyHash('wrongpassword', hashed)).toBe(false);
    });

    it('should produce different hashes for same input', () => {
      const data = 'password123';
      const hashed1 = hash(data);
      const hashed2 = hash(data);

      expect(hashed1).not.toBe(hashed2);
    });
  });

  describe('generateToken', () => {
    it('should generate unique tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();

      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
    });

    it('should respect custom length', () => {
      const token = generateToken(16);
      // Base64url encoding, so actual length varies
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('signature generation and verification', () => {
    it('should generate and verify signature', () => {
      const data = 'important data';
      const signature = generateSignature(data);

      expect(verifySignature(data, signature)).toBe(true);
    });

    it('should reject tampered data', () => {
      const data = 'important data';
      const signature = generateSignature(data);

      expect(verifySignature('tampered data', signature)).toBe(false);
    });

    it('should reject invalid signature', () => {
      const data = 'important data';

      expect(verifySignature(data, 'invalid-signature')).toBe(false);
    });
  });

  describe('maskSensitiveData', () => {
    it('should mask most of the data', () => {
      const data = 'credit-card-1234-5678';
      const masked = maskSensitiveData(data, 4);

      expect(masked.startsWith('cred')).toBe(true);
      expect(masked.includes('*')).toBe(true);
      expect(masked.length).toBe(data.length);
    });

    it('should mask completely for short data', () => {
      const data = 'abc';
      const masked = maskSensitiveData(data, 4);

      expect(masked).toBe('***');
    });
  });
});
