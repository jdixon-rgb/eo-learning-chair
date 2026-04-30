import { useEffect, useState } from 'react'
import { getLifeEventPhotoUrl } from '@/lib/lifelineStore'

// Resolve a signed URL for a stored lifeline-event photo. Returns null
// while loading or if the path is missing.
//
// Stores the resolved URL alongside the path it was fetched for so a stale
// URL never paints when the caller swaps to a different photo — render
// derives its return value from `state.path === path` instead of relying
// on a synchronous setState inside the effect.
export function useLifelinePhotoUrl(path) {
  const [state, setState] = useState({ path: null, url: null })

  useEffect(() => {
    if (!path) return undefined
    let cancelled = false
    getLifeEventPhotoUrl(path).then((u) => {
      if (!cancelled) setState({ path, url: u })
    })
    return () => {
      cancelled = true
    }
  }, [path])

  if (!path) return null
  return state.path === path ? state.url : null
}
