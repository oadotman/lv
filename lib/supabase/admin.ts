import { createClient } from '@supabase/supabase-js';

// Create a Supabase admin client with service role key
// WARNING: This client bypasses Row Level Security and should only be used in server-side code
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to get admin client with error checking
export function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }

  return supabaseAdmin;
}

// Create a new admin client instance (alias for compatibility)
export function createAdminClient() {
  return getSupabaseAdmin();
}