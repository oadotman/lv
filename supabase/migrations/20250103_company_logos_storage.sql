-- Create company-logos storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organization admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization admins can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;

-- Allow organization admins and owners to upload logos
CREATE POLICY "Organization admins can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM user_organizations
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Allow organization admins and owners to update their logos
CREATE POLICY "Organization admins can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM user_organizations
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Allow organization admins and owners to delete their logos
CREATE POLICY "Organization admins can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text
    FROM user_organizations
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Allow public to view logos (for rate confirmations, etc.)
CREATE POLICY "Public can view logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-logos');