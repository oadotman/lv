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

  // Fetch organization data for a user
  const fetchOrganization = async (userId: string) => {
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
      await fetchOrganization(session.user.id)
    }
  }

  useEffect(() => {
    console.log('🔐 AuthContext: Initializing...')

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('⏱️ AuthContext: Session check timed out after 10s, proceeding without auth')
      setLoading(false)
    }, 10000) // Increased to 10 second timeout for slower connections

    // Get initial session
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
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
          await fetchOrganization(session.user.id)
          console.log('✅ AuthContext: Organization fetch complete')
        }

        console.log('🎯 AuthContext: Initialization complete, setting loading=false')
        setLoading(false)
        clearTimeout(timeout)
      })
      .catch((error) => {
        console.error('❌ AuthContext: Error loading session', error)
        setLoading(false)
        clearTimeout(timeout)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 AuthContext: Auth state changed', {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        timestamp: new Date().toISOString()
      })

      // Only set loading to true if this is a significant auth event
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        console.log('🔄 AuthContext: Processing auth event:', event)
      }

      setSession(session)
      setUser(session?.user ?? null)

      // Fetch organization if user exists
      if (session?.user) {
        console.log('🏢 AuthContext: Fetching organization after auth change')
        await fetchOrganization(session.user.id)
      } else {
        setOrganization(null)
      }

      // Always ensure loading is false after processing auth changes
      console.log('✅ AuthContext: Auth change processed, setting loading=false')
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
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
