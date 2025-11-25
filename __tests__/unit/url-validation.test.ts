// =====================================================
// URL VALIDATION TESTS
// Tests SSRF protection
// =====================================================

import { validateUrl, validateDownloadUrl } from '@/lib/security/url-validation';

describe('URL Validation - SSRF Protection', () => {
  describe('validateUrl', () => {
    it('should allow valid public URLs', () => {
      const validUrls = [
        'https://example.com/file.mp3',
        'http://public-bucket.s3.amazonaws.com/audio.wav',
        'https://storage.googleapis.com/recordings/call.mp3',
      ];

      validUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should block localhost URLs', () => {
      const localhostUrls = [
        'http://localhost:3000/api/health',
        'http://127.0.0.1:5432/db',
        'https://localhost/admin',
      ];

      localhostUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('private');
      });
    });

    it('should block private IP addresses', () => {
      const privateIps = [
        'http://192.168.1.1/router',
        'http://10.0.0.1/internal',
        'http://172.16.0.1/network',
      ];

      privateIps.forEach(url => {
        const result = validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('private');
      });
    });

    it('should block AWS metadata endpoint', () => {
      const result = validateUrl('http://169.254.169.254/latest/meta-data/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('private');
    });

    it('should reject invalid protocols', () => {
      const invalidProtocols = [
        'ftp://example.com/file.mp3',
        'file:///etc/passwd',
        'javascript:alert(1)',
      ];

      invalidProtocols.forEach(url => {
        const result = validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('protocol');
      });
    });

    it('should handle malformed URLs', () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        '://example.com',
      ];

      malformedUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('validateDownloadUrl', () => {
    it('should reject URLs that are too long', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(3000);
      const result = validateDownloadUrl(longUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should reject data: URLs', () => {
      const result = validateDownloadUrl('data:text/plain,Hello');
      expect(result.valid).toBe(false);
    });
  });
});
