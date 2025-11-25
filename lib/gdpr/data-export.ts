// =====================================================
// GDPR DATA EXPORT SERVICE
// Handles user data export requests (GDPR Article 15)
// =====================================================

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { User } from '@supabase/supabase-js';

export interface UserDataExport {
  exportDate: string;
  userData: {
    profile: any;
    calls: any[];
    transcripts: any[];
    extractions: any[];
    templates: any[];
    auditLogs: any[];
  };
  metadata: {
    recordCount: number;
    dataCategories: string[];
  };
}

/**
 * Export all user data in GDPR-compliant format
 */
export async function exportUserData(userId: string): Promise<UserDataExport> {
  const supabase = createServerClient();
  const adminClient = createAdminClient();

  try {
    // Fetch user profile
    const { data: userData } = await adminClient.auth.admin.getUserById(userId);

    // Fetch calls
    const { data: calls } = await supabase
      .from('calls')
      .select('*')
      .eq('user_id', userId);

    // Fetch transcripts
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('*')
      .in('call_id', calls?.map(c => c.id) || []);

    // Fetch extractions
    const { data: extractions } = await supabase
      .from('extractions')
      .select('*')
      .in('call_id', calls?.map(c => c.id) || []);

    // Fetch templates (if user-specific templates exist)
    const { data: templates } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', userId);

    // Fetch audit logs
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const exportData: UserDataExport = {
      exportDate: new Date().toISOString(),
      userData: {
        profile: {
          id: userData.user.id,
          email: userData.user.email,
          created_at: userData.user.created_at,
          user_metadata: userData.user.user_metadata,
        },
        calls: calls || [],
        transcripts: transcripts || [],
        extractions: extractions || [],
        templates: templates || [],
        auditLogs: auditLogs || [],
      },
      metadata: {
        recordCount:
          (calls?.length || 0) +
          (transcripts?.length || 0) +
          (extractions?.length || 0) +
          (templates?.length || 0) +
          (auditLogs?.length || 0),
        dataCategories: [
          'profile',
          'calls',
          'transcripts',
          'extractions',
          'templates',
          'audit_logs'
        ],
      },
    };

    // Log the export request
    await logAuditEvent({
      userId,
      action: 'data_export',
      details: { recordCount: exportData.metadata.recordCount },
    });

    return exportData;
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw new Error('Failed to export user data');
  }
}

/**
 * Generate CSV format export
 */
export function exportToCSV(data: UserDataExport): string {
  const lines: string[] = [];

  // Header
  lines.push('CallSync AI - User Data Export');
  lines.push(`Export Date: ${data.exportDate}`);
  lines.push(`Total Records: ${data.metadata.recordCount}`);
  lines.push('');

  // Profile
  lines.push('=== USER PROFILE ===');
  lines.push(`User ID,Email,Created At`);
  lines.push(`${data.userData.profile.id},${data.userData.profile.email},${data.userData.profile.created_at}`);
  lines.push('');

  // Calls
  lines.push('=== CALLS ===');
  if (data.userData.calls.length > 0) {
    const callHeaders = Object.keys(data.userData.calls[0]).join(',');
    lines.push(callHeaders);
    data.userData.calls.forEach(call => {
      lines.push(Object.values(call).join(','));
    });
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate JSON format export
 */
export function exportToJSON(data: UserDataExport): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Log audit event helper
 */
async function logAuditEvent(event: {
  userId: string;
  action: string;
  details: any;
}) {
  const supabase = createServerClient();

  await supabase.from('audit_logs').insert({
    user_id: event.userId,
    action: event.action,
    details: event.details,
    ip_address: null, // Will be populated by API route
    user_agent: null, // Will be populated by API route
    created_at: new Date().toISOString(),
  });
}
