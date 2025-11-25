// =====================================================
// GDPR DATA EXPORT INTEGRATION TEST
// Tests for GDPR data export API
// =====================================================

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/gdpr/export/route';

// Mock authentication
jest.mock('@/lib/supabase/server', () => ({
  requireAuth: jest.fn().mockResolvedValue({ id: 'test-user-id' }),
  createServerClient: jest.fn(),
  createAdminClient: jest.fn(),
}));

// Mock GDPR export functions
jest.mock('@/lib/gdpr/data-export', () => ({
  exportUserData: jest.fn().mockResolvedValue({
    exportDate: '2024-01-01T00:00:00.000Z',
    userData: {
      profile: { id: 'test-user-id', email: 'test@example.com' },
      calls: [],
      transcripts: [],
      extractions: [],
      templates: [],
      auditLogs: [],
    },
    metadata: {
      recordCount: 0,
      dataCategories: ['profile', 'calls', 'transcripts', 'extractions', 'templates', 'audit_logs'],
    },
  }),
  exportToJSON: jest.fn().mockReturnValue('{"exportDate":"2024-01-01T00:00:00.000Z"}'),
  exportToCSV: jest.fn().mockReturnValue('Export Date: 2024-01-01T00:00:00.000Z'),
}));

// Mock audit logger
jest.mock('@/lib/logging/audit-logger', () => ({
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

// Mock app logger
jest.mock('@/lib/logging/app-logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    api: jest.fn(),
  },
}));

describe('GDPR Data Export API', () => {
  describe('POST /api/gdpr/export', () => {
    it('should export user data as JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/gdpr/export', {
        method: 'POST',
        body: JSON.stringify({ format: 'json' }),
      });

      const response = await POST(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
    });

    it('should export user data as CSV', async () => {
      const request = new NextRequest('http://localhost:3000/api/gdpr/export', {
        method: 'POST',
        body: JSON.stringify({ format: 'csv' }),
      });

      const response = await POST(request);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
    });
  });

  describe('GET /api/gdpr/export', () => {
    it('should return export metadata', async () => {
      const request = new NextRequest('http://localhost:3000/api/gdpr/export', {
        method: 'GET',
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.metadata).toBeDefined();
      expect(json.exportDate).toBeDefined();
    });
  });
});
