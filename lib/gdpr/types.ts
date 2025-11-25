/**
 * GDPR Compliance Types
 *
 * Defines types for GDPR-compliant data management including
 * data export, deletion, retention, and consent management.
 */

export type DataExportFormat = 'json' | 'csv' | 'xml';
export type DataExportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DataDeletionStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ConsentType = 'essential' | 'analytics' | 'marketing' | 'functional';
export type ConsentStatus = 'granted' | 'denied' | 'pending';

/**
 * Data Export Request
 * Represents a user's request to export their personal data
 */
export interface DataExportRequest {
  id: string;
  user_id: string;
  format: DataExportFormat;
  status: DataExportStatus;
  requested_at: string;
  completed_at?: string;
  download_url?: string;
  expires_at?: string;
  error_message?: string;
}

/**
 * Data Deletion Request
 * Represents a user's "Right to be Forgotten" request
 */
export interface DataDeletionRequest {
  id: string;
  user_id: string;
  status: DataDeletionStatus;
  requested_at: string;
  scheduled_for: string;
  completed_at?: string;
  deleted_data_summary?: Record<string, number>;
  error_message?: string;
}

/**
 * User Consent Record
 * Tracks user consent for various data processing activities
 */
export interface UserConsent {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  status: ConsentStatus;
  granted_at?: string;
  revoked_at?: string;
  ip_address?: string;
  user_agent?: string;
  version: string; // Privacy policy version
}

/**
 * Data Retention Policy
 * Defines retention rules for different data types
 */
export interface DataRetentionPolicy {
  data_type: string;
  retention_days: number;
  description: string;
  legal_basis: string;
}

/**
 * Exportable User Data
 * Complete user data package for GDPR export
 */
export interface ExportableUserData {
  user_profile: {
    id: string;
    email: string;
    full_name: string;
    created_at: string;
    updated_at: string;
  };
  calls: Array<{
    id: string;
    call_date: string;
    customer_name: string;
    sales_rep: string;
    duration: number;
    status: string;
    outcome?: string;
    sentiment?: string;
    created_at: string;
  }>;
  transcripts: Array<{
    call_id: string;
    assembly_id: string;
    created_at: string;
  }>;
  extractions: Array<{
    call_id: string;
    created_at: string;
  }>;
  templates: Array<{
    id: string;
    name: string;
    created_at: string;
  }>;
  consents: UserConsent[];
  audit_logs: Array<{
    action: string;
    timestamp: string;
    ip_address?: string;
  }>;
}

/**
 * Audit Log Entry
 * Records all data access and modifications for compliance
 */
export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Data Processing Agreement
 * Records acceptance of terms and data processing agreements
 */
export interface DataProcessingAgreement {
  id: string;
  user_id: string;
  agreement_type: 'terms' | 'privacy_policy' | 'dpa';
  version: string;
  accepted_at: string;
  ip_address?: string;
  user_agent?: string;
}
