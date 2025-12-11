'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from './supabase/client'
import { useRouter } from 'next/navigation'

interface OrganizationData {
  id: string
  name: string
  plan_type: string
  max_members: number
  max_minutes_monthly: number
}

interface AuthContextType {
  user: User | null
  session: Session | null
  organization: OrganizationData | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  organization: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [organization, setOrganization] = useState<OrganizationData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Create supabase client lazily to avoid SSR issues
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }, [])

  // Track if component is mounted
  const mountedRef = useRef(true)
  const initializationRef = useRef(false)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Safe state setter that checks if mounted
  const safeSetState = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>) => {
    return (value: React.SetStateAction<T>) => {
      if (mountedRef.current) {
        setter(value)
      }
    }
  }, [])

  // Force loading to false after timeout
  const startLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }

    loadingTimeoutRef.current = setTimeout(() => {
      console.error('[AuthContext] CRITICAL: Loading timeout reached - forcing loading=false')
      safeSetState(setLoading)(false)
    }, 5000) // 5 second hard timeout
  }, [safeSetState])

  // Clear loading timeout
  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }
  }, [])

  // Declare processInvitationsInBackground first (forward declaration)
  const processInvitationsInBackgroundRef = useRef<(userId: string, userEmail: string) => void>()

  // Fetch organization data with error handling
  const fetchOrganization = useCallback(async (userId: string, userEmail?: string) => {
    try {
      console.log('🏢 Fetching organization for user:', userId)

      // Quick fetch without invitation processing to avoid delays
      const { data: userOrgs } = await getSupabase()
        .from('user_organizations')
        .select(`
          organization_id,
          role,
          joined_at,
          organization:organizations (
            id,
            name,
            plan_type,
            max_members,
            max_minutes_monthly
          )
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })
        .limit(1) // Just get the most recent one

      if (userOrgs && userOrgs.length > 0 && userOrgs[0].organization) {
        const orgData = userOrgs[0].organization
        const org = Array.isArray(orgData) ? orgData[0] : orgData
        console.log('✅ Organization found:', org.name, 'Plan:', org.plan_type, 'Limit:', org.max_minutes_monthly)
        safeSetState(setOrganization)(org as OrganizationData)
      } else {
        console.log('⚠️ No organization found for user')
        safeSetState(setOrganization)(null)
      }

      // Process invitations in background without blocking
      if (userEmail && processInvitationsInBackgroundRef.current) {
        processInvitationsInBackgroundRef.current(userId, userEmail)
      }

    } catch (error) {
      console.error('❌ Error fetching organization:', error)
      safeSetState(setOrganization)(null)
    }
  }, [safeSetState, getSupabase])

  // Process invitations without blocking the UI
  const processInvitationsInBackground = useCallback(async (userId: string, userEmail: string) => {
    try {
      console.log('📬 Processing invitations in background for:', userEmail)

      const { data: pendingInvites } = await getSupabase()
        .from('team_invitations')
        .select('*, organization:organizations(id, name)')
        .eq('email', userEmail.toLowerCase())
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())

      if (pendingInvites && pendingInvites.length > 0) {
        console.log(`📬 Found ${pendingInvites.length} pending invitation(s)`)

        // Process each invitation
        for (const invite of pendingInvites) {
          if (!invite.organization_id) continue

          // Add to organization
          await getSupabase()
            .from('user_organizations')
            .insert({
              user_id: userId,
              organization_id: invite.organization_id,
              role: invite.role || 'member',
              invited_by: invite.invited_by,
            })

          // Mark as accepted
          await getSupabase()
            .from('team_invitations')
            .update({
              accepted_at: new Date().toISOString(),
              accepted_by: userId
            })
            .eq('id', invite.id)
        }

        // Refresh organization after processing invitations
        fetchOrganization(userId, userEmail)
      }
    } catch (error) {
      console.error('❌ Error processing invitations:', error)
      // Don't block on invitation errors
    }
  }, [fetchOrganization, getSupabase])

  // Assign the ref after creation to solve circular dependency
  processInvitationsInBackgroundRef.current = processInvitationsInBackground

  // Initialize auth state
  const initializeAuth = useCallback(async () => {
    if (initializationRef.current) {
      console.log('⚠️ Auth already initializing, skipping...')
      return
    }

    initializationRef.current = true
    startLoadingTimeout()

    try {
      console.log('🔐 Starting auth initialization...')

      let currentSession = null
      let currentUser = null

      // Try to get session
      const { data: { session }, error: sessionError } = await getSupabase().auth.getSession()

      if (!mountedRef.current) return

      if (sessionError) {
        console.error('❌ Error getting session:', sessionError)
        safeSetState(setLoading)(false)
        clearLoadingTimeout()
        return
      }

      if (session) {
        currentSession = session
        currentUser = session.user
      }

      if (currentUser) {
        console.log('✅ User authenticated:', currentUser.id)
        safeSetState(setUser)(currentUser)
        safeSetState(setSession)(currentSession)

        // Fetch organization but don't wait for it
        fetchOrganization(currentUser.id, currentUser.email).finally(() => {
          safeSetState(setLoading)(false)
          clearLoadingTimeout()
        })
      } else {
        console.log('⚠️ No active session')
        safeSetState(setUser)(null)
        safeSetState(setSession)(null)
        safeSetState(setOrganization)(null)
        safeSetState(setLoading)(false)
        clearLoadingTimeout()
      }
    } catch (error) {
      console.error('❌ Critical error in auth initialization:', error)
      safeSetState(setLoading)(false)
      clearLoadingTimeout()
    } finally {
      initializationRef.current = false
    }
  }, [startLoadingTimeout, clearLoadingTimeout, safeSetState, fetchOrganization, getSupabase])

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      let currentUser = null

      // Try getSession first
      const { data: { session }, error: sessionError } = await getSupabase().auth.getSession()

      if (sessionError && sessionError.message?.includes('Refresh Token')) {
        // If refresh token error, try getUser
        const { data: { user }, error: userError } = await getSupabase().auth.getUser()
        if (!userError && user) {
          currentUser = user
        }
      } else if (session?.user) {
        currentUser = session.user
      }

      if (currentUser && mountedRef.current) {
        safeSetState(setUser)(currentUser)
        await fetchOrganization(currentUser.id, currentUser.email)
      }
    } catch (error) {
      console.error('❌ Error refreshing user:', error)
    }
  }, [safeSetState, fetchOrganization, getSupabase])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      await getSupabase().auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('❌ Error signing out:', error)
    }
  }, [router, getSupabase])

  useEffect(() => {
    mountedRef.current = true

    // Initialize auth
    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return

        console.log('🔄 Auth state changed:', event)

        // Don't set loading during state changes
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          safeSetState(setSession)(session)
          safeSetState(setUser)(session?.user ?? null)

          if (session?.user) {
            fetchOrganization(session.user.id, session.user.email)
          }
        } else if (event === 'SIGNED_OUT') {
          safeSetState(setUser)(null)
          safeSetState(setSession)(null)
          safeSetState(setOrganization)(null)
        }
      }
    )

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
      clearLoadingTimeout()
    }
  }, []) // Empty deps intentionally - only run once

  return (
    <AuthContext.Provider value={{
      user,
      session,
      organization,
      loading,
      signOut,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}