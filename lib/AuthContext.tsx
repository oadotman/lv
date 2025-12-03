'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
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

  // Check and auto-accept pending invitations for a user
  const checkAndAcceptPendingInvitations = async (userId: string, userEmail: string) => {
    try {
      console.log('🔍 Checking for pending invitations for:', userEmail)

      // Fetch pending invitations for this email
      const { data: pendingInvites, error } = await supabase
        .from('team_invitations')
        .select(`
          *,
          organization:organizations(
            id,
            name,
            slug
          )
        `)
        .eq('email', userEmail.toLowerCase())
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())

      if (error) {
        console.error('❌ Error fetching pending invitations:', error)
        return false
      }

      if (!pendingInvites || pendingInvites.length === 0) {
        console.log('✅ No pending invitations found')
        return false
      }

      console.log(`📬 Found ${pendingInvites.length} pending invitation(s)`)

      // Auto-accept all pending invitations
      for (const invite of pendingInvites) {
        // Skip if no organization_id
        if (!invite.organization_id) {
          console.warn('⚠️ Skipping invitation without organization_id:', invite.id)
          continue
        }

        const orgName = invite.organization?.name || `Organization ${invite.organization_id}`
        console.log(`🤝 Auto-accepting invitation to: ${orgName}`)

        // Add user to organization
        const { error: memberError } = await supabase
          .from('user_organizations')
          .insert({
            user_id: userId,
            organization_id: invite.organization_id,
            role: invite.role || 'member',
            invited_by: invite.invited_by,
          })

        // Check if insert was successful or if user is already a member
        if (!memberError || memberError.code === '23505') { // 23505 = unique violation (already exists)
          // Mark invitation as accepted
          const { error: updateError } = await supabase
            .from('team_invitations')
            .update({
              accepted_at: new Date().toISOString(),
              accepted_by: userId
            })
            .eq('id', invite.id)

          if (!updateError) {
            console.log(`✅ Auto-accepted invitation to: ${orgName}`)
          } else {
            console.error('❌ Error updating invitation:', updateError)
          }
        } else {
          console.error('❌ Error adding user to organization:', memberError)
        }
      }

      return true // Invitations were processed

    } catch (error) {
      console.error('❌ Error in auto-accept process:', error)
      return false
    }
  }

  // Fetch organization data for a user
  const fetchOrganization = async (userId: string, userEmail?: string) => {
    // First, check and auto-accept any pending invitations
    if (userEmail) {
      const invitationsProcessed = await checkAndAcceptPendingInvitations(userId, userEmail)
      if (invitationsProcessed) {
        console.log('🔄 Invitations processed, fetching updated organizations...')
      }
    }
    try {
      console.log('🏢 Fetching organizations for user:', userId)

      // Fetch all user organizations with their details, ordered by joined_at (newest first)
      const { data: userOrgs } = await supabase
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
        .order('joined_at', { ascending: false }) // Most recent first

      if (userOrgs && userOrgs.length > 0) {
        console.log(`📊 Found ${userOrgs.length} organization(s) for user`)

        // Prefer non-free organizations over free ones
        // If multiple non-free orgs, use the most recently joined
        let selectedOrg = null;

        // First, try to find a non-free organization
        const nonFreeOrg = userOrgs.find((uo: any) =>
          uo.organization && uo.organization.plan_type !== 'free'
        )

        if (nonFreeOrg && nonFreeOrg.organization) {
          selectedOrg = nonFreeOrg.organization
          console.log('✅ Selected non-free organization:', selectedOrg.name, '(Plan:', selectedOrg.plan_type, ')')
        } else {
          // Fall back to the most recently joined organization
          const mostRecentOrg = userOrgs[0] as any
          if (mostRecentOrg && mostRecentOrg.organization) {
            selectedOrg = mostRecentOrg.organization
            console.log('📌 Selected most recent organization:', selectedOrg.name, '(Plan:', selectedOrg.plan_type, ')')
          }
        }

        if (selectedOrg) {
          setOrganization(selectedOrg)
        } else {
          console.warn('⚠️ No valid organization found')
          setOrganization(null)
        }
      } else {
        console.log('AuthContext: No organizations found for user')
        setOrganization(null)
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
      setOrganization(null)
    }
  }

  // Refresh user data
  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      setUser(session.user)
      await fetchOrganization(session.user.id, session.user.email)
    }
  }

  useEffect(() => {
    console.log('🔐 AuthContext: Initializing...')
    let isMounted = true // Add mounted flag to prevent state updates after unmount

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('⏱️ AuthContext: Forcing loading=false after 10s timeout')
        setLoading(false)
      }
    }, 10000) // 10 second safety timeout

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!isMounted) return // Don't update state if unmounted

        if (error) {
          console.error('❌ AuthContext: Error getting session:', error)
          setLoading(false)
          clearTimeout(loadingTimeout)
          return
        }

        console.log('🔐 AuthContext: Initial session loaded', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id
        })

        setSession(session)
        setUser(session?.user ?? null)

        // Fetch organization if user exists
        if (session?.user) {
          console.log('🏢 AuthContext: Fetching organization for user:', session.user.id)
          try {
            await fetchOrganization(session.user.id, session.user.email)
            console.log('✅ AuthContext: Organization fetch complete')
          } catch (orgError) {
            console.error('❌ AuthContext: Error fetching organization:', orgError)
            // Continue even if org fetch fails
          }
        }

        if (isMounted) {
          console.log('🎯 AuthContext: Initialization complete, setting loading=false')
          setLoading(false)
          clearTimeout(loadingTimeout)
        }
      } catch (error) {
        console.error('❌ AuthContext: Unexpected error during initialization:', error)
        if (isMounted) {
          setLoading(false)
          clearTimeout(loadingTimeout)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return // Don't process if unmounted

      console.log('🔄 AuthContext: Auth state changed', {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        timestamp: new Date().toISOString()
      })

      // Don't set loading to true during auth state changes - this causes the perpetual loading bug
      // The initial load is already complete, state changes should be seamless

      setSession(session)
      setUser(session?.user ?? null)

      // Fetch organization if user exists
      if (session?.user) {
        console.log('🏢 AuthContext: Fetching organization after auth change')
        try {
          await fetchOrganization(session.user.id, session.user.email)
        } catch (error) {
          console.error('❌ AuthContext: Error fetching organization after auth change:', error)
          // Continue without organization
        }
      } else {
        setOrganization(null)
      }

      // Don't change loading state during auth changes - keep the app responsive
      console.log('✅ AuthContext: Auth change processed')
    })

    return () => {
      isMounted = false // Mark as unmounted
      subscription.unsubscribe()
      clearTimeout(loadingTimeout)
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, session, organization, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}
