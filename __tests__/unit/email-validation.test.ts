// =====================================================
// EMAIL VALIDATION TESTS
// Tests RFC 5322 compliant validation
// =====================================================

import { sanitizeEmail } from '@/lib/sanitize-simple';

describe('Email Validation', () => {
  describe('Valid Emails', () => {
    it('should accept standard email formats', () => {
      const validEmails = [
        'user@example.com',
        'john.doe@company.co.uk',
        'test+tag@domain.io',
        'admin_123@test-domain.com',
      ];

      validEmails.forEach(email => {
        expect(() => sanitizeEmail(email)).not.toThrow();
      });
    });
  });

  describe('Invalid Emails', () => {
    it('should reject emails without valid TLD', () => {
      const invalidEmails = [
        'user@localhost',
        'test@test',
        'admin@c',
      ];

      invalidEmails.forEach(email => {
        expect(() => sanitizeEmail(email)).toThrow('Invalid email');
      });
    });

    it('should reject emails with consecutive dots', () => {
      expect(() => sanitizeEmail('user..name@example.com')).toThrow();
    });

    it('should reject emails starting with dot', () => {
      expect(() => sanitizeEmail('.user@example.com')).toThrow();
    });

    it('should reject invalid domains', () => {
      const invalidDomains = [
        'test@localhost.com',
        'user@test.local',
        'admin@example.test',
      ];

      invalidDomains.forEach(email => {
        expect(() => sanitizeEmail(email)).toThrow('Invalid email domain');
      });
    });
  });

  describe('Sanitization', () => {
    it('should convert to lowercase', () => {
      const result = sanitizeEmail('USER@EXAMPLE.COM');
      expect(result).toBe('user@example.com');
    });

    it('should trim whitespace', () => {
      const result = sanitizeEmail('  user@example.com  ');
      expect(result).toBe('user@example.com');
    });

    it('should limit length to 255 characters', () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      const result = sanitizeEmail(longEmail);
      expect(result.length).toBeLessThanOrEqual(255);
    });
  });
});
