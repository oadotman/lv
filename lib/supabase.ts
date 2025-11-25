import { createBrowserClient } from '@supabase/ssr'

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Supabase Environment Check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl,
  // Don't log the full key for security, just first/last chars
  keyPrefix: supabaseAnonKey?.substring(0, 10) + '...',
})

if (!supabaseUrl || !supabaseAnonKey) {
  const error = 'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local'
  console.error(error)
  throw new Error(error)
}

// Create browser-compatible Supabase client that uses cookies (for SSR compatibility)
// This ensures sessions are stored in cookies that the middleware can access
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

console.log('Supabase browser client initialized successfully (using cookies for SSR)')

// Auth helper functions
export const authHelpers = {
  // Sign up with email and password
  signUp: async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    return { data, error }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in with Supabase...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log('Supabase signIn response:', {
        hasData: !!data,
        hasSession: !!data?.session,
        hasUser: !!data?.user,
        error: error?.message || null
      })
      return { data, error }
    } catch (err) {
      console.error('Exception in signIn:', err)
      return {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Network error. Please check your connection.',
          name: 'NetworkError',
          status: 0
        } as any
      }
    }
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Get session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Reset password for email
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
  },

  // Update password
  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    return { data, error }
  },
}
