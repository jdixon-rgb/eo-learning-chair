import { createContext, useContext, useState, useEffect, useCallback, createElement } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'

const AuthContext = createContext(null)

const DEV_PROFILE = { role: 'learning_chair', full_name: 'Dev Mode', email: 'dev@local', chapter_id: '00000000-0000-4000-a000-000000000001' }

const VIEW_AS_STORAGE_KEY = 'eo-view-as-role'
const VIEW_AS_SAP_CONTACT_KEY = 'eo-view-as-sap-contact'
const MOCK_MODE_STORAGE_KEY = 'eo-mock-mode-enabled'
const MOCK_PERSONA_STORAGE_KEY = 'eo-mock-persona-id'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewAsRole, setViewAsRoleState] = useState(() => {
    try { return localStorage.getItem(VIEW_AS_STORAGE_KEY) || null } catch { return null }
  })
  const [viewAsSapContactId, setViewAsSapContactIdState] = useState(() => {
    try { return localStorage.getItem(VIEW_AS_SAP_CONTACT_KEY) || null } catch { return null }
  })
  const [mockModeFlag, setMockModeFlagState] = useState(() => {
    try { return localStorage.getItem(MOCK_MODE_STORAGE_KEY) === '1' } catch { return false }
  })
  const [mockPersonaId, setMockPersonaIdState] = useState(() => {
    try { return localStorage.getItem(MOCK_PERSONA_STORAGE_KEY) || null } catch { return null }
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
  const isDemoUser = role === 'demo_user'
  const isPresident = !!role && ['president', 'president_elect', 'president_elect_elect'].includes(role)
  const isChapterStaff = !!role && ['chapter_executive_director', 'chapter_experience_coordinator'].includes(role)
  const canSwitchRoles = isSuperAdmin || isPresident || isChapterStaff

  // Effective role: super admins and presidents can view as other roles.
  const effectiveRole = canSwitchRoles && viewAsRole ? viewAsRole : role
  const isImpersonating = canSwitchRoles && !!viewAsRole

  // ── Mock Data Mode ─────────────────────────────────────────────
  // Two paths in:
  //   1. Super-admin flips the toggle in their own browser (mockModeFlag + role check)
  //   2. A demo_user logs in — they are permanently locked into mock mode, no escape
  // A chapter user can NEVER see mock data: the role check gates the flag,
  // and non-super-admin / non-demo_user sessions ignore it entirely.
  const isMockMode = isDemoUser || (isSuperAdmin && mockModeFlag)

  const setMockMode = useCallback((next) => {
    try {
      if (next) localStorage.setItem(MOCK_MODE_STORAGE_KEY, '1')
      else {
        localStorage.removeItem(MOCK_MODE_STORAGE_KEY)
        localStorage.removeItem(MOCK_PERSONA_STORAGE_KEY)
      }
    } catch { /* ignore */ }
    setMockModeFlagState(!!next)
    if (!next) setMockPersonaIdState(null)
  }, [])

  const setMockPersonaId = useCallback((id) => {
    try {
      if (id) localStorage.setItem(MOCK_PERSONA_STORAGE_KEY, id)
      else localStorage.removeItem(MOCK_PERSONA_STORAGE_KEY)
    } catch { /* ignore */ }
    setMockPersonaIdState(id || null)
  }, [])

  const setViewAsRole = useCallback((nextRole) => {
    try {
      if (nextRole) localStorage.setItem(VIEW_AS_STORAGE_KEY, nextRole)
      else localStorage.removeItem(VIEW_AS_STORAGE_KEY)
    } catch { /* ignore */ }
    setViewAsRoleState(nextRole || null)
    // Clear SAP contact impersonation when switching away from sap_contact
    if (nextRole !== 'sap_contact') {
      try { localStorage.removeItem(VIEW_AS_SAP_CONTACT_KEY) } catch { /* ignore */ }
      setViewAsSapContactIdState(null)
    }
  }, [])

  const setViewAsSapContactId = useCallback((id) => {
    try {
      if (id) localStorage.setItem(VIEW_AS_SAP_CONTACT_KEY, id)
      else localStorage.removeItem(VIEW_AS_SAP_CONTACT_KEY)
    } catch { /* ignore */ }
    setViewAsSapContactIdState(id || null)
  }, [])

  // Effective SAP contact ID: impersonation takes priority
  const effectiveSapContactId = canSwitchRoles && viewAsSapContactId
    ? viewAsSapContactId
    : profile?.sap_contact_id ?? null

  // PRIVACY GUARD: true when viewing another user's role context.
  // Any hook that accesses personal data (reflections, lifeline, forum
  // discussions, parking lot) MUST check this and return empty data.
  // Impersonation previews the UI/experience — never the person's private content.
  const isPreviewingOtherUser = isImpersonating || !!viewAsSapContactId

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
    isChapterStaff,
    canSwitchRoles,
    chapterId: profile?.chapter_id ?? null,
    isCommittee: role === 'committee_member',
    isBoardLiaison: role === 'board_liaison',
    isBoardMember: !!role && ['super_admin', 'president', 'board_liaison', 'chapter_experience_coordinator', 'chapter_executive_director'].includes(role),
    isMember: role === 'member',
    isSAPContact: role === 'sap_contact',
    sapContactId: effectiveSapContactId,
    viewAsSapContactId,
    setViewAsSapContactId,
    isPreviewingOtherUser,
    isDemoUser,
    isMockMode,
    setMockMode,
    mockPersonaId,
    setMockPersonaId,
  }

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
