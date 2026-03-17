import { createContext, useContext, useState, useEffect, createElement } from 'react'
import { useAuth } from './auth'
import { supabase, isSupabaseConfigured } from './supabase'

const ChapterContext = createContext(null)

const STORAGE_KEY = 'eo-active-chapter'

export function ChapterProvider({ children }) {
  const { profile, isSuperAdmin } = useAuth()

  const [allChapters, setAllChapters] = useState([])
  const [activeChapterId, setActiveChapterIdRaw] = useState(null)
  const [isChapterReady, setIsChapterReady] = useState(false)

  // Fetch chapters for super admins, or set the single chapter for regular users
  useEffect(() => {
    if (!profile) return

    if (isSuperAdmin) {
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
          setAllChapters(data)

          // Restore saved preference or default to first chapter
          const saved = localStorage.getItem(STORAGE_KEY)
          const savedExists = saved && data.some((c) => c.id === saved)
          setActiveChapterIdRaw(savedExists ? saved : data[0]?.id ?? null)
          setIsChapterReady(true)
        })
    } else {
      // Regular user - scoped to their own chapter
      setActiveChapterIdRaw(profile.chapter_id ?? null)
      setAllChapters([])
      setIsChapterReady(true)
    }
  }, [profile, isSuperAdmin])

  const setActiveChapterId = (id) => {
    setActiveChapterIdRaw(id)
    if (isSuperAdmin) {
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
  }

  return createElement(ChapterContext.Provider, { value }, children)
}

export function useChapter() {
  const ctx = useContext(ChapterContext)
  if (!ctx) throw new Error('useChapter must be used within ChapterProvider')
  return ctx
}
