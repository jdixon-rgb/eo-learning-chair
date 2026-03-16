import { createContext, useContext, useState, useEffect, useCallback, createElement } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'

const AuthContext = createContext(null)

const DEV_PROFILE = { role: 'learning_chair', full_name: 'Dev Mode', email: 'dev@local' }

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

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
        // No session in production — use admin fallback until auth is enforced
        setProfile(DEV_PROFILE)
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
  const isAdmin = !!role && ['learning_chair', 'chapter_experience_coordinator', 'chapter_executive_director'].includes(role)

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role,
    loading,
    signIn,
    signOut,
    isAdmin,
    isCommittee: role === 'committee_member',
    isBoardLiaison: role === 'board_liaison',
    isMember: role === 'member',
  }

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
