import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRecommendations, findSimilarRecommendations } from '@/lib/recommendationsStore'
import PageHeader from '@/lib/pageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronUp, Loader2, Plus, Send, Sparkles, Trash2 } from 'lucide-react'

const STATUSES = [
  { id: 'open', label: 'Open', tone: 'bg-blue-100 text-blue-800' },
  { id: 'in_progress', label: 'In Progress', tone: 'bg-amber-100 text-amber-800' },
  { id: 'shipped', label: 'Shipped', tone: 'bg-emerald-100 text-emerald-800' },
  { id: 'closed', label: 'Closed', tone: 'bg-gray-200 text-gray-700' },
  { id: 'duplicate', label: 'Duplicate', tone: 'bg-gray-100 text-gray-600' },
]

const EFFORTS = [
  { id: '', label: '— effort —' },
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'difficult', label: 'Difficult' },
]

const EFFORT_TONE = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  difficult: 'bg-rose-50 text-rose-700 border-rose-200',
}

export default function RecommendationsPage() {
  const { user, isSuperAdmin } = useAuth()
  const {
    recommendations, voteCounts, myVotes, loading, error,
    submit, toggleVote, updateRecommendation, removeRecommendation,
  } = useRecommendations()

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const similar = useMemo(
    () => findSimilarRecommendations(title, recommendations),
    [title, recommendations],
  )

  const sorted = useMemo(() => {
    const open = recommendations.filter(r => r.status === 'open' || r.status === 'in_progress')
    const shipped = recommendations.filter(r => r.status === 'shipped')
    const other = recommendations.filter(r => r.status === 'closed' || r.status === 'duplicate')
    const byVotes = (a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0)
    return [...open.sort(byVotes), ...shipped.sort(byVotes), ...other.sort(byVotes)]
  }, [recommendations, voteCounts])

  const stats = useMemo(() => {
    const open = recommendations.filter(r => r.status === 'open' || r.status === 'in_progress').length
    const shipped = recommendations.filter(r => r.status === 'shipped').length
    return `${open} open · ${shipped} shipped · ${recommendations.length} total`
  }, [recommendations])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    const { error: err } = await submit({ title, body })
    setSubmitting(false)
    if (err) {
      setSubmitError(err.message || 'Submit failed.')
      return
    }
    setTitle('')
    setBody('')
    setShowForm(false)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <PageHeader title="Recommendations" subtitle={stats} />
        <Button size="sm" className="ml-auto" onClick={() => setShowForm(v => !v)}>
          <Plus className="h-4 w-4" /> {showForm ? 'Close' : 'Suggest'}
        </Button>
      </div>

      {!user && (
        <div className="rounded-lg border bg-amber-50 text-amber-900 px-4 py-3 text-sm">
          Sign in to submit a recommendation or vote.
        </div>
      )}

      {error && (
        <div className="rounded-lg border bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <div>
            <label className="text-xs font-medium">Title</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="One-line summary of what to add or change"
              autoFocus
            />
          </div>

          {similar.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <div className="flex items-center gap-1.5 text-amber-900 font-medium mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                Similar recommendations already exist — upvote one of these instead?
              </div>
              <div className="space-y-1.5">
                {similar.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-2 bg-white rounded px-3 py-2">
                    <span className="text-sm">{s.title}</span>
                    <button
                      type="button"
                      onClick={() => toggleVote(s.id)}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded cursor-pointer ${myVotes.has(s.id) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
                    >
                      <ChevronUp className="h-3 w-3" />
                      {voteCounts[s.id] || 0}{myVotes.has(s.id) ? ' (voted)' : ''}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium">Details (optional)</label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="What should it do? Why does it matter? Any edge cases?"
              rows={4}
            />
          </div>

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); setTitle(''); setBody('') }}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!title.trim() || submitting || !user}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Submitting</> : <><Send className="h-4 w-4 mr-1" /> Submit</>}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading recommendations…
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No recommendations yet. Be the first to suggest one.
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map(rec => {
            const status = STATUSES.find(s => s.id === rec.status) || STATUSES[0]
            const voted = myVotes.has(rec.id)
            const count = voteCounts[rec.id] || 0
            const canDelete = isSuperAdmin || rec.submitted_by_user_id === user?.id
            return (
              <li key={rec.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleVote(rec.id)}
                    disabled={!user}
                    title={user ? (voted ? 'Remove your vote' : 'Upvote') : 'Sign in to vote'}
                    className={`flex flex-col items-center justify-center rounded-lg px-2 py-1.5 min-w-[44px] cursor-pointer transition-colors ${voted ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
                  >
                    <ChevronUp className="h-4 w-4" />
                    <span className="text-xs font-semibold">{count}</span>
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold">{rec.title}</h3>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${status.tone}`}>{status.label}</span>
                      {rec.effort && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${EFFORT_TONE[rec.effort]}`}>{rec.effort}</span>
                      )}
                      {rec.shipped_in_version && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          shipped in v{rec.shipped_in_version}
                        </span>
                      )}
                    </div>
                    {rec.body && <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">{rec.body}</p>}
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {rec.submitter_name || 'Anonymous'}
                      {rec.submitter_chapter_name ? ` · ${rec.submitter_chapter_name}` : ''}
                      {' · '}
                      {new Date(rec.created_at).toLocaleDateString()}
                    </p>

                    {/* Super admin controls */}
                    {isSuperAdmin && (
                      <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-2">
                        <Select
                          className="h-8 text-xs"
                          value={rec.status}
                          onChange={e => {
                            const next = e.target.value
                            const updates = { status: next }
                            if (next === 'shipped' && !rec.shipped_at) updates.shipped_at = new Date().toISOString()
                            if (next !== 'shipped') updates.shipped_at = null
                            updateRecommendation(rec.id, updates)
                          }}
                        >
                          {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </Select>
                        <Select
                          className="h-8 text-xs"
                          value={rec.effort || ''}
                          onChange={e => updateRecommendation(rec.id, { effort: e.target.value || null })}
                        >
                          {EFFORTS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                        </Select>
                        <Input
                          className="h-8 text-xs w-32"
                          placeholder="shipped in v…"
                          value={rec.shipped_in_version || ''}
                          onChange={e => updateRecommendation(rec.id, { shipped_in_version: e.target.value || null })}
                        />
                      </div>
                    )}
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this recommendation?')) removeRecommendation(rec.id)
                      }}
                      className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
