import { createContext, useContext, useState, useEffect, useCallback, createElement } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'

const AuthContext = createContext(null)

const DEV_PROFILE = { role: 'learning_chair', full_name: 'Dev Mode', email: 'dev@local', chapter_id: '00000000-0000-4000-a000-000000000001' }

const VIEW_AS_STORAGE_KEY = 'eo-view-as-role'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewAsRole, setViewAsRoleState] = useState(() => {
    try { return localStorage.getItem(VIEW_AS_STORAGE_KEY) || null } catch { return null }
  })

  const fetchProfile = useCallback(async (userId) => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error && data) setProfile(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setProfile(DEV_PROFILE)
      setLoading(false)
      return
    }

    // Use onAuthStateChange as the single source of truth.
    // It fires INITIAL_SESSION on setup, then SIGNED_IN / SIGNED_OUT on changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user) {
        fetchProfile(s.user.id)
      } else if (import.meta.env.DEV) {
        // Dev mode: no session — use admin fallback so app remains usable
        setProfile(DEV_PROFILE)
        setLoading(false)
      } else {
        // Production: no session — require login
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = async (email) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } }
    const redirectTo = window.location.origin
    return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
  }

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const role = profile?.role ?? null
  const isAdmin = !!role && ['super_admin', 'president', 'finance_chair', 'learning_chair', 'engagement_chair', 'chapter_experience_coordinator', 'chapter_executive_director'].includes(role)
  const isSuperAdmin = role === 'super_admin'
  const isPresident = !!role && ['president', 'president_elect', 'president_elect_elect'].includes(role)
  const canSwitchRoles = isSuperAdmin || isPresident

  // Effective role: super admins and presidents can view as other roles.
  const effectiveRole = canSwitchRoles && viewAsRole ? viewAsRole : role
  const isImpersonating = canSwitchRoles && !!viewAsRole

  const setViewAsRole = useCallback((nextRole) => {
    try {
      if (nextRole) localStorage.setItem(VIEW_AS_STORAGE_KEY, nextRole)
      else localStorage.removeItem(VIEW_AS_STORAGE_KEY)
    } catch { /* ignore */ }
    setViewAsRoleState(nextRole || null)
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role,
    effectiveRole,
    viewAsRole,
    setViewAsRole,
    isImpersonating,
    loading,
    signIn,
    signOut,
    isAdmin,
    isSuperAdmin,
    isPresident,
    canSwitchRoles,
    chapterId: profile?.chapter_id ?? null,
    isCommittee: role === 'committee_member',
    isBoardLiaison: role === 'board_liaison',
    isBoardMember: !!role && ['super_admin', 'president', 'board_liaison', 'chapter_experience_coordinator', 'chapter_executive_director'].includes(role),
    isMember: role === 'member',
    isSAPContact: role === 'sap_contact',
    sapContactId: profile?.sap_contact_id ?? null,
  }

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
