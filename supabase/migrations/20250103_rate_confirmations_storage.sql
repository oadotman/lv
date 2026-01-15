-- Create rate-confirmations storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rate-confirmations',
  'rate-confirmations',
  true,
  10485760, -- 10MB limit for PDFs
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organization members can upload rate confirmations" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can view their rate confirmations" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can update their rate confirmations" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can delete their rate confirmations" ON storage.objects;
DROP POLICY IF EXISTS "Public can view rate confirmations" ON storage.objects;

-- Allow organization admins and owners to upload rate confirmations
CREATE POLICY "Organization members can upload rate confirmations"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'rate-confirmations'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM user_organizations
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Allow organization members to view their rate confirmations
CREATE POLICY "Organization members can view their rate confirmations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'rate-confirmations'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM user_organizations
    WHERE user_id = auth.uid()
  )
);

-- Allow organization admins and owners to update their rate confirmations
CREATE POLICY "Organization members can update their rate confirmations"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'rate-confirmations'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM user_organizations
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Allow organization admins and owners to delete their rate confirmations
CREATE POLICY "Organization members can delete their rate confirmations"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'rate-confirmations'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM user_organizations
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Allow public to view rate confirmations (for sharing with carriers)
CREATE POLICY "Public can view rate confirmations"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'rate-confirmations');

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rate_confirmations_load_id
ON rate_confirmations(load_id);

CREATE INDEX IF NOT EXISTS idx_rate_confirmations_organization_id
ON rate_confirmations(organization_id);

CREATE INDEX IF NOT EXISTS idx_rate_confirmations_rate_con_number
ON rate_confirmations(rate_con_number);

CREATE INDEX IF NOT EXISTS idx_rate_confirmations_status
ON rate_confirmations(status);

CREATE INDEX IF NOT EXISTS idx_rate_confirmations_latest
ON rate_confirmations(load_id, is_latest)
WHERE is_latest = true;