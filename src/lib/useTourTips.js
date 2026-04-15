import { useCallback, useState, useEffect } from 'react'
import { useAuth } from './auth'
import { TOUR_CONTENT } from './tourContent'

const STORAGE_PREFIX = 'eo-tour-dismissed'

function getKey(userId, tipId) {
  return `${STORAGE_PREFIX}-${userId || 'anon'}-${tipId}`
}

/**
 * Tour tips hook — manages dismissal state for role-specific
 * first-visit tips, keyed per user in localStorage.
 */
export function useTourTips() {
  const { user, effectiveRole } = useAuth()
  const userId = user?.id || 'anon'

  // Re-render counter that bumps when a tip is dismissed or reset
  const [tick, setTick] = useState(0)

  // Bump tick when user changes so dismissals re-read correctly
  useEffect(() => { setTick(t => t + 1) }, [userId])

  const isDismissed = useCallback((tipId) => {
    try {
      return localStorage.getItem(getKey(userId, tipId)) === '1'
    } catch {
      return false
    }
  }, [userId, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback((tipId) => {
    try {
      localStorage.setItem(getKey(userId, tipId), '1')
    } catch { /* ignore */ }
    setTick(t => t + 1)
  }, [userId])

  const resetAll = useCallback(() => {
    try {
      const prefix = `${STORAGE_PREFIX}-${userId}-`
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(prefix)) keys.push(k)
      }
      keys.forEach(k => localStorage.removeItem(k))
    } catch { /* ignore */ }
    setTick(t => t + 1)
  }, [userId])

  const getTip = useCallback((path) => {
    if (!effectiveRole) return null
    return TOUR_CONTENT[path]?.[effectiveRole] ?? null
  }, [effectiveRole])

  return { isDismissed, dismiss, resetAll, getTip }
}
