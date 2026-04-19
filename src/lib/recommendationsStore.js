// Cross-chapter feature recommendations (Learning Chair scope for v1).
//
// Page-local hook (no provider) — only the RecommendationsPage consumes
// this data. Loads all recommendations + the current user's votes on
// mount, then exposes mutations.

import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'
import { useAuth } from './auth'
import { useChapter } from './chapter'

export const SURFACE_LEARNING_CHAIR = 'learning_chair'

export function useRecommendations(surface = SURFACE_LEARNING_CHAIR) {
  const { user, profile } = useAuth()
  const { activeChapter } = useChapter()
  const [recommendations, setRecommendations] = useState([])
  const [voteCounts, setVoteCounts] = useState({})         // recId -> count
  const [myVotes, setMyVotes] = useState(new Set())        // recIds I've voted on
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    setError(null)
    const [recsRes, votesRes, myVotesRes] = await Promise.all([
      supabase.from('feature_recommendations').select('*').eq('surface', surface).order('created_at', { ascending: false }),
      supabase.from('feature_recommendation_votes').select('recommendation_id'),
      user
        ? supabase.from('feature_recommendation_votes').select('recommendation_id').eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
    ])
    if (recsRes.error) {
      setError(recsRes.error.message)
      setLoading(false)
      return
    }
    const counts = {}
    for (const v of votesRes.data || []) {
      counts[v.recommendation_id] = (counts[v.recommendation_id] || 0) + 1
    }
    setRecommendations(recsRes.data || [])
    setVoteCounts(counts)
    setMyVotes(new Set((myVotesRes.data || []).map(v => v.recommendation_id)))
    setLoading(false)
  }, [surface, user])

  useEffect(() => { refresh() }, [refresh])

  const submit = useCallback(async ({ title, body }) => {
    if (!user || !title?.trim()) return { error: { message: 'Title required.' } }
    const row = {
      surface,
      submitted_by_user_id: user.id,
      submitted_by_chapter_id: activeChapter?.id || null,
      submitter_name: profile?.full_name || '',
      submitter_chapter_name: activeChapter?.name || '',
      title: title.trim(),
      body: (body || '').trim(),
    }
    const { data, error: err } = await supabase.from('feature_recommendations').insert(row).select().single()
    if (err) return { error: err }
    setRecommendations(prev => [data, ...prev])
    return { data }
  }, [user, profile, activeChapter, surface])

  const toggleVote = useCallback(async (recommendationId) => {
    if (!user) return
    const hasVoted = myVotes.has(recommendationId)
    if (hasVoted) {
      // Optimistic removal
      setMyVotes(prev => { const n = new Set(prev); n.delete(recommendationId); return n })
      setVoteCounts(prev => ({ ...prev, [recommendationId]: Math.max((prev[recommendationId] || 1) - 1, 0) }))
      const { error: err } = await supabase
        .from('feature_recommendation_votes')
        .delete()
        .eq('recommendation_id', recommendationId)
        .eq('user_id', user.id)
      if (err) refresh()  // revert via reload
    } else {
      setMyVotes(prev => new Set(prev).add(recommendationId))
      setVoteCounts(prev => ({ ...prev, [recommendationId]: (prev[recommendationId] || 0) + 1 }))
      const { error: err } = await supabase
        .from('feature_recommendation_votes')
        .insert({ recommendation_id: recommendationId, user_id: user.id })
      if (err) refresh()
    }
  }, [user, myVotes, refresh])

  const updateRecommendation = useCallback(async (id, updates) => {
    const next = { ...updates, updated_at: new Date().toISOString() }
    setRecommendations(prev => prev.map(r => r.id === id ? { ...r, ...next } : r))
    const { error: err } = await supabase.from('feature_recommendations').update(next).eq('id', id)
    if (err) {
      setError(err.message)
      refresh()
    }
  }, [refresh])

  const removeRecommendation = useCallback(async (id) => {
    setRecommendations(prev => prev.filter(r => r.id !== id))
    const { error: err } = await supabase.from('feature_recommendations').delete().eq('id', id)
    if (err) {
      setError(err.message)
      refresh()
    }
  }, [refresh])

  return {
    recommendations,
    voteCounts,
    myVotes,
    loading,
    error,
    refresh,
    submit,
    toggleVote,
    updateRecommendation,
    removeRecommendation,
  }
}

// Word-set similarity for duplicate suggestion. Returns 0–1.
function jaccard(a, b) {
  const setA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean))
  const setB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean))
  if (setA.size === 0 || setB.size === 0) return 0
  let inter = 0
  for (const w of setA) if (setB.has(w)) inter++
  const union = setA.size + setB.size - inter
  return union === 0 ? 0 : inter / union
}

export function findSimilarRecommendations(draft, recommendations, { threshold = 0.35, max = 3 } = {}) {
  if (!draft || draft.trim().length < 4) return []
  const scored = recommendations
    .filter(r => r.status !== 'duplicate')
    .map(r => ({ rec: r, score: jaccard(draft, r.title) }))
    .filter(s => s.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
  return scored.map(s => s.rec)
}
