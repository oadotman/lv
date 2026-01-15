-- Create carrier_documents table for storing carrier-related documents
CREATE TABLE IF NOT EXISTS carrier_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Document information
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'other', -- 'w9', 'insurance', 'authority', 'contract', 'other'
    url TEXT NOT NULL,
    file_path TEXT,
    file_size INTEGER,
    mime_type TEXT,

    -- Metadata
    uploaded_by UUID NOT NULL REFERENCES profiles(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- For insurance certificates, etc.

    -- Indexing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_carrier_documents_carrier ON carrier_documents(carrier_id);
CREATE INDEX IF NOT EXISTS idx_carrier_documents_org ON carrier_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_carrier_documents_type ON carrier_documents(type);
CREATE INDEX IF NOT EXISTS idx_carrier_documents_expires ON carrier_documents(expires_at);

-- Add RLS policies
ALTER TABLE carrier_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents for their organization
CREATE POLICY carrier_documents_select ON carrier_documents
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert documents for their organization
CREATE POLICY carrier_documents_insert ON carrier_documents
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid()
        )
        AND uploaded_by = auth.uid()
    );

-- Policy: Users can update their own documents
CREATE POLICY carrier_documents_update ON carrier_documents
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid()
        )
        AND uploaded_by = auth.uid()
    );

-- Policy: Users can delete their own documents or org admins can delete any
CREATE POLICY carrier_documents_delete ON carrier_documents
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid()
        )
        AND (
            uploaded_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid()
                AND role IN ('admin', 'owner')
            )
        )
    );

-- Create storage bucket for carrier documents if not exists
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
    'carrier-documents',
    'carrier-documents',
    true,
    false,
    52428800, -- 50MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies
CREATE POLICY "Users can upload carrier documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'carrier-documents'
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can view carrier documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'carrier-documents'
    );

CREATE POLICY "Users can delete their carrier documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'carrier-documents'
        AND auth.uid() IS NOT NULL
    );