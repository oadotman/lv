// =====================================================
// SUPABASE CLIENT-SIDE UTILITY
// For use in client components (browser)
// =====================================================

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Re-export for convenience
export { createClient as createBrowserClient };
