const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupCompanyLogosStorage() {
  try {
    console.log('Setting up company logos storage bucket...\n');

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    const bucketExists = buckets.some(bucket => bucket.name === 'company-logos');

    if (bucketExists) {
      console.log('✅ Bucket "company-logos" already exists');
    } else {
      // Create the bucket
      const { data, error: createError } = await supabase.storage.createBucket('company-logos', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880, // 5MB
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        return;
      }

      console.log('✅ Created bucket "company-logos"');
    }

    // Set up RLS policies
    console.log('\nSetting up RLS policies for company-logos bucket...');

    // The policies need to be set via SQL
    const policies = [
      {
        name: 'Allow organization members to upload logos',
        definition: `
          CREATE POLICY "Organization members can upload logos"
          ON storage.objects
          FOR INSERT
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
        `
      },
      {
        name: 'Allow organization members to update logos',
        definition: `
          CREATE POLICY "Organization members can update logos"
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
        `
      },
      {
        name: 'Allow organization members to delete logos',
        definition: `
          CREATE POLICY "Organization members can delete logos"
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
        `
      },
      {
        name: 'Allow public access to view logos',
        definition: `
          CREATE POLICY "Public can view logos"
          ON storage.objects
          FOR SELECT
          TO public
          USING (bucket_id = 'company-logos');
        `
      }
    ];

    console.log(`
⚠️  Please run these SQL commands in your Supabase SQL editor to set up the storage policies:

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organization members can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Organization members can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;

${policies.map(p => p.definition).join('\n')}
    `);

    console.log('\n✅ Company logos storage setup complete!');
    console.log('\nNext steps:');
    console.log('1. Run the SQL commands above in your Supabase SQL editor');
    console.log('2. Test the logo upload functionality in the Company Profile settings page');

  } catch (error) {
    console.error('Error setting up storage:', error);
  }
}

setupCompanyLogosStorage();