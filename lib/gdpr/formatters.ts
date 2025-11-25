/**
 * Data Export Formatters
 *
 * Utilities for converting data to various export formats
 */

import { ExportableUserData } from './types';

/**
 * Convert JSON object to CSV format
 * Creates multiple CSV sections for different data types
 */
export function json2csv(data: ExportableUserData): string {
  const sections: string[] = [];

  // User Profile Section
  sections.push('=== USER PROFILE ===');
  sections.push(objectToCsv([data.user_profile]));
  sections.push('');

  // Calls Section
  if (data.calls.length > 0) {
    sections.push('=== CALLS ===');
    sections.push(objectToCsv(data.calls));
    sections.push('');
  }

  // Transcripts Section
  if (data.transcripts.length > 0) {
    sections.push('=== TRANSCRIPTS ===');
    sections.push(objectToCsv(data.transcripts));
    sections.push('');
  }

  // Extractions Section
  if (data.extractions.length > 0) {
    sections.push('=== EXTRACTIONS ===');
    sections.push(objectToCsv(data.extractions));
    sections.push('');
  }

  // Templates Section
  if (data.templates.length > 0) {
    sections.push('=== TEMPLATES ===');
    sections.push(objectToCsv(data.templates));
    sections.push('');
  }

  // Consents Section
  if (data.consents.length > 0) {
    sections.push('=== CONSENTS ===');
    sections.push(objectToCsv(data.consents));
    sections.push('');
  }

  // Audit Logs Section
  if (data.audit_logs.length > 0) {
    sections.push('=== AUDIT LOGS ===');
    sections.push(objectToCsv(data.audit_logs));
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Convert array of objects to CSV string
 */
function objectToCsv(data: any[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Get all unique keys from all objects
  const keys = Array.from(
    new Set(data.flatMap(obj => Object.keys(obj)))
  );

  // Create header row
  const header = keys.map(escapeCSV).join(',');

  // Create data rows
  const rows = data.map(obj =>
    keys.map(key => {
      const value = obj[key];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'object') {
        return escapeCSV(JSON.stringify(value));
      }
      return escapeCSV(String(value));
    }).join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Escape CSV field value
 */
function escapeCSV(value: string): string {
  // If value contains comma, newline, or quote, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format data for email notification
 */
export function formatExportNotification(
  userEmail: string,
  downloadUrl: string,
  expiresAt: string
): string {
  return `
Dear User,

Your data export request has been completed. You can download your data using the link below:

Download Link: ${downloadUrl}

This link will expire on: ${new Date(expiresAt).toLocaleString()}

For security reasons, please download your data as soon as possible.

If you did not request this export, please contact our support team immediately.

Best regards,
CallSync AI Team
  `.trim();
}

/**
 * Format data deletion confirmation email
 */
export function formatDeletionNotification(
  userEmail: string,
  deletedDataSummary: Record<string, number>
): string {
  const summary = Object.entries(deletedDataSummary)
    .map(([type, count]) => `  - ${type}: ${count} records`)
    .join('\n');

  return `
Dear User,

Your data deletion request has been completed. The following data has been permanently deleted:

${summary}

This action cannot be undone. Your account has been closed and you will no longer receive communications from us.

If you did not request this deletion, please contact our support team immediately.

Best regards,
CallSync AI Team
  `.trim();
}
