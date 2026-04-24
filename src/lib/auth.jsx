import { createContext, useContext, useState, useEffect, useCallback, createElement } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import { fetchCurrentBetaTerms, hasAckedCurrentBetaTerms, acknowledgeBetaTerms } from './betaTerms'

const AuthContext = createContext(null)

const DEV_PROFILE = { role: 'learning_chair', full_name: 'Dev Mode', email: 'dev@local', chapter_id: '00000000-0000-4000-a000-000000000001' }

const VIEW_AS_STORAGE_KEY = 'eo-view-as-role'
const VIEW_AS_SAP_CONTACT_KEY = 'eo-view-as-sap-contact'
const VIEW_AS_REGION_KEY = 'eo-view-as-region'

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
  const [viewAsRegion, setViewAsRegionState] = useState(() => {
    try { return localStorage.getItem(VIEW_AS_REGION_KEY) || null } catch { return null }
  })
  const [currentTerms, setCurrentTerms] = useState(null)
  const [requiresTermsAck, setRequiresTermsAck] = useState(false)

  const fetchProfile = useCallback(async (userId) => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // Allowlist gate — single source of truth for "is this user authorized to
    // use the app?" Magic-link and phone-OTP flows check is_invited_member
    // BEFORE sending the link/code; OAuth (Google, Microsoft, etc.) bypasses
    // that pre-check because the provider hands us a proven identity out of
    // band. So we re-check after every sign-in. Cheap (one RPC) and catches
    // every non-whitelisted path uniformly.
    if (data?.email || data?.phone) {
      const { data: invited } = await supabase.rpc('is_invited_member', {
        check_email: data.email || null,
        check_phone: data.phone || null,
      })
      if (invited === false) {
        await supabase.auth.signOut()
        try {
          sessionStorage.setItem(
            'oauth_rejected',
            "This account isn't on the chapter allowlist. Contact your Learning Chair to request access."
          )
        } catch { /* storage blocked — error just won't surface on next render */ }
        setSession(null)
        setProfile(null)
        setLoading(false)
        return
      }
    }

    if (!error && data) setProfile(data)
    const [terms, acked] = await Promise.all([
      fetchCurrentBetaTerms(),
      hasAckedCurrentBetaTerms(),
    ])
    setCurrentTerms(terms)
    setRequiresTermsAck(!!terms && !acked)
    setLoading(false)
  }, [])

  // Acknowledge the current terms version. Clears the gate on success.
  const acknowledgeTerms = useCallback(async () => {
    if (!currentTerms) return { error: { message: 'No current terms loaded' } }
    const { error } = await acknowledgeBetaTerms(currentTerms.id)
    if (!error) setRequiresTermsAck(false)
    return { error }
  }, [currentTerms])

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

  // Phone-based sign-in: send a 6-digit SMS OTP to the given E.164 phone.
  // Caller must already have gated on is_invited_member to avoid Twilio costs
  // for non-allowlisted numbers.
  const signInWithPhone = async (phone) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } }
    return supabase.auth.signInWithOtp({ phone })
  }

  // Verify the SMS OTP. On success, Supabase Auth creates the auth.users row
  // (which fires handle_new_user → links profile from member_invites by phone).
  const verifyPhoneOtp = async (phone, token) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } }
    return supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  }

  // OAuth sign-in (Google). Sidesteps email deliverability entirely —
  // corporate gateways that drop our magic-link emails don't interfere with
  // OAuth because the provider handles auth directly. Whitelist check
  // happens post-auth in fetchProfile above.
  //
  // redirectTo lands on a dedicated callback page (/auth/callback) rather
  // than "/", so the raw Supabase token hash and any ?error=… from the
  // provider never flash in front of the authenticated app shell.
  const signInWithGoogle = async () => {
    if (!supabase) return { error: { message: 'Supabase not configured' } }
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  // OAuth sign-in (Microsoft / Azure AD). Same motivation as Google —
  // covers Microsoft 365 / Outlook / Hotmail / Live users whose corporate
  // mail filters eat magic links. Tenant breadth (personal vs. work+school
  // vs. both) is configured in the Supabase Azure provider, not here.
  const signInWithMicrosoft = async () => {
    if (!supabase) return { error: { message: 'Supabase not configured' } }
    return supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
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
  const isChapterStaff = !!role && ['chapter_executive_director', 'chapter_experience_coordinator'].includes(role)
  const canSwitchRoles = isSuperAdmin || isPresident || isChapterStaff

  // Effective role: super admins and presidents can view as other roles.
  const effectiveRole = canSwitchRoles && viewAsRole ? viewAsRole : role
  const isImpersonating = canSwitchRoles && !!viewAsRole

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
    // Clear region impersonation when switching away from regional roles
    if (nextRole !== 'regional_learning_chair_expert') {
      try { localStorage.removeItem(VIEW_AS_REGION_KEY) } catch { /* ignore */ }
      setViewAsRegionState(null)
    }
  }, [])

  const setViewAsSapContactId = useCallback((id) => {
    try {
      if (id) localStorage.setItem(VIEW_AS_SAP_CONTACT_KEY, id)
      else localStorage.removeItem(VIEW_AS_SAP_CONTACT_KEY)
    } catch { /* ignore */ }
    setViewAsSapContactIdState(id || null)
  }, [])

  const setViewAsRegion = useCallback((region) => {
    try {
      if (region) localStorage.setItem(VIEW_AS_REGION_KEY, region)
      else localStorage.removeItem(VIEW_AS_REGION_KEY)
    } catch { /* ignore */ }
    setViewAsRegionState(region || null)
  }, [])

  // Effective SAP contact ID: impersonation takes priority
  const effectiveSapContactId = canSwitchRoles && viewAsSapContactId
    ? viewAsSapContactId
    : profile?.sap_contact_id ?? null

  // Effective region: when a super-admin is impersonating a regional role,
  // their picked region wins; otherwise fall back to the profile's region.
  // Any dashboard that groups data by region (e.g. RegionalLearningDashboard)
  // should read this — never profile.region directly.
  const effectiveRegion = canSwitchRoles && viewAsRole === 'regional_learning_chair_expert' && viewAsRegion
    ? viewAsRegion
    : profile?.region ?? null

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
    signInWithPhone,
    verifyPhoneOtp,
    signInWithGoogle,
    signInWithMicrosoft,
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
    effectiveRegion,
    viewAsRegion,
    setViewAsRegion,
    isPreviewingOtherUser,
    currentTerms,
    requiresTermsAck,
    acknowledgeTerms,
  }

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
