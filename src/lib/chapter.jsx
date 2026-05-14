import { createContext, useContext, useState, useEffect, useCallback, createElement } from 'react'
import { useAuth } from './auth'
import { supabase, isSupabaseConfigured } from './supabase'
import { REGIONAL_ROLES } from './permissions'

const ChapterContext = createContext(null)

const STORAGE_KEY = 'eo-active-chapter'

export function ChapterProvider({ children }) {
  const { profile, isSuperAdmin, effectiveRegion } = useAuth()
  const isRegionalRole = REGIONAL_ROLES.includes(profile?.role)

  const [allChapters, setAllChapters] = useState([])
  const [activeChapterId, setActiveChapterIdRaw] = useState(null)
  const [isChapterReady, setIsChapterReady] = useState(false)

  // Chapter-switching access is granted to:
  //   - Super admins (full platform view)
  //   - Regional-role users (scoped to their region via a post-fetch filter)
  //
  // Regular chair/member users stay scoped to a single chapter_id. The
  // region filter is applied client-side on the super-set returned by
  // Supabase; RLS on the chapters table already permits authenticated
  // reads, so this doesn't expose anything new.
  useEffect(() => {
    if (!profile) return

    const canSwitchChapters = isSuperAdmin || isRegionalRole

    if (canSwitchChapters) {
      if (!isSupabaseConfigured()) {
        setIsChapterReady(true)
        return
      }
      supabase
        .from('chapters')
        .select('*')
        .then(({ data, error }) => {
          if (error || !data) {
            setIsChapterReady(true)
            return
          }
          // For regional roles, filter to chapters tagged with their region.
          // effectiveRegion handles both real regional users and super-admin
          // impersonation. If no region selected (impersonation with nothing
          // picked yet), leave the list empty rather than show all chapters.
          const scoped = isRegionalRole && !isSuperAdmin
            ? data.filter(c => c.region && c.region === effectiveRegion)
            : data
          setAllChapters(scoped)

          // Restore saved preference or default to first chapter
          const saved = localStorage.getItem(STORAGE_KEY)
          const savedExists = saved && scoped.some((c) => c.id === saved)
          setActiveChapterIdRaw(savedExists ? saved : scoped[0]?.id ?? null)
          setIsChapterReady(true)
        })
    } else {
      // Regular user - scoped to their own chapter
      setActiveChapterIdRaw(profile.chapter_id ?? null)
      setAllChapters([])
      setIsChapterReady(true)
    }
  }, [profile, isSuperAdmin, isRegionalRole, effectiveRegion])

  // Manual refresh — re-fetches chapters without disturbing the user's
  // active selection. Used by the super-admin region rename flow.
  const refreshChapters = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    const { data, error } = await supabase.from('chapters').select('*')
    if (error || !data) return
    const scoped = isRegionalRole && !isSuperAdmin
      ? data.filter(c => c.region && c.region === effectiveRegion)
      : data
    setAllChapters(scoped)
  }, [isSuperAdmin, isRegionalRole, effectiveRegion])

  const setActiveChapterId = (id) => {
    setActiveChapterIdRaw(id)
    if (isSuperAdmin || isRegionalRole) {
      localStorage.setItem(STORAGE_KEY, id)
    }
  }

  const activeChapter = allChapters.find((c) => c.id === activeChapterId) ?? null

  const value = {
    activeChapterId,
    setActiveChapterId,
    allChapters,
    activeChapter,
    isChapterReady,
    refreshChapters,
  }

  return createElement(ChapterContext.Provider, { value }, children)
}

export function useChapter() {
  const ctx = useContext(ChapterContext)
  if (!ctx) throw new Error('useChapter must be used within ChapterProvider')
  return ctx
}
