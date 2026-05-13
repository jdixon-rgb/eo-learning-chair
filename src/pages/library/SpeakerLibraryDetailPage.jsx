import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useChapter } from '@/lib/chapter'
import { useFiscalYear } from '@/lib/fiscalYearContext'
import { hasPermission } from '@/lib/permissions'
import {
  ArrowLeft, Star, Pencil, Plus, ExternalLink, Loader2, Globe2,
  Image as ImageIcon, History, Trash2, MessageSquarePlus, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import PageHeader from '@/lib/pageHeader'
import { formatDate } from '@/lib/utils'
import { useFormatCurrency } from '@/lib/useFormatCurrency'
import EditLibrarySpeakerDialog from '@/components/library/EditLibrarySpeakerDialog'

// Field labels used in the revision-history rendering. Anything not
// listed here falls back to the raw key — but every editable field
// from LibrarySpeakerForm should have a friendly label.
const FIELD_LABELS = {
  name: 'Name',
  topic: 'Topic',
  eo_chapter: 'EO chapter',
  class_year: 'Class year',
  source: 'Source',
  source_url: 'Source URL',
  bio: 'Bio',
  photo_url: 'Photo URL',
  honorarium_amount: 'Honorarium',
  honorarium_notes: 'Honorarium notes',
  travel_amount: 'Travel cost',
  travel_notes: 'Travel notes',
}

export default function SpeakerLibraryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { effectiveRole, profile } = useAuth()
  const { activeChapterId, allChapters } = useChapter()
  const { activeFiscalYear } = useFiscalYear()
  const canEdit = hasPermission(effectiveRole, 'canEditSpeakerLibrary')
  const canReview = hasPermission(effectiveRole, 'canReviewSpeakers')
  const canImport = hasPermission(effectiveRole, 'canImportFromLibrary')
  const formatCurrency = useFormatCurrency()

  const [speaker, setSpeaker] = useState(null)
  const [reviews, setReviews] = useState([])
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  const fetchAll = useCallback(async () => {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    setLoading(true)
    const [{ data: spk }, { data: revs }, { data: rh }] = await Promise.all([
      supabase.from('public_speakers').select('*').eq('id', id).single(),
      supabase
        .from('public_speaker_reviews')
        .select('id,public_speaker_id,reviewer_user_id,reviewer_chapter_id,rating,body,event_format,created_at,updated_at')
        .eq('public_speaker_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('public_speaker_revisions')
        .select('id,editor_user_id,editor_chapter_id,changed_at,changes')
        .eq('public_speaker_id', id)
        .order('changed_at', { ascending: false }),
    ])
    setSpeaker(spk || null)
    setReviews(revs || [])
    setRevisions(rh || [])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Fetch user names for reviewers + editors so we can attribute properly.
  // Two-step: collect user ids, fetch profiles in one round-trip.
  const [userById, setUserById] = useState({})
  useEffect(() => {
    const ids = new Set()
    for (const r of reviews) if (r.reviewer_user_id) ids.add(r.reviewer_user_id)
    for (const h of revisions) if (h.editor_user_id) ids.add(h.editor_user_id)
    if (ids.size === 0) { setUserById({}); return }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id,full_name,email')
        .in('id', [...ids])
      if (cancelled) return
      const map = {}
      for (const p of data || []) map[p.id] = p
      setUserById(map)
    })()
    return () => { cancelled = true }
  }, [reviews, revisions])

  const chapterById = useMemo(() => {
    const m = {}
    for (const c of allChapters) m[c.id] = c
    return m
  }, [allChapters])

  const myReview = useMemo(
    () => reviews.find(r => r.reviewer_user_id === profile?.id) || null,
    [reviews, profile]
  )

  const avg = useMemo(() => {
    if (reviews.length === 0) return null
    const sum = reviews.reduce((a, r) => a + r.rating, 0)
    return sum / reviews.length
  }, [reviews])

  const handleImport = async () => {
    if (!activeChapterId) {
      setImportMsg('Pick an active chapter first.')
      return
    }
    setImporting(true)
    setImportMsg('')
    try {
      // Defensive duplicate check — same library origin + same chapter.
      const { data: existing } = await supabase
        .from('speakers')
        .select('id,name')
        .eq('chapter_id', activeChapterId)
        .eq('imported_from_library_id', speaker.id)
        .maybeSingle()
      if (existing) {
        setImportMsg(`Already in this chapter's pipeline as "${existing.name}".`)
        setImporting(false)
        return
      }

      // Copy the relevant fields. The library row stays untouched.
      // pipeline_stage is NOT NULL on speakers; default new imports to
      // 'researching' so they show up at the start of the kanban.
      const insertPayload = {
        chapter_id: activeChapterId,
        name: speaker.name,
        topic: speaker.topic || '',
        bio: speaker.bio || '',
        fee_estimated: speaker.honorarium_amount ?? null,
        imported_from_library_id: speaker.id,
        share_scope: 'chapter_only',
        pipeline_stage: 'researching',
      }
      const { data: inserted, error } = await supabase
        .from('speakers')
        .insert(insertPayload)
        .select('id')
        .single()
      if (error) throw error

      // Speakers row exists in the chapter library now; also create the
      // per-FY speaker_pipeline row so the speaker actually appears in
      // the Pipeline kanban (otherwise "Add to my pipeline" lies).
      const { error: pipelineErr } = await supabase
        .from('speaker_pipeline')
        .insert({
          speaker_id: inserted.id,
          chapter_id: activeChapterId,
          fiscal_year: activeFiscalYear,
          pipeline_stage: 'researching',
          fee_estimated: speaker.honorarium_amount ?? null,
        })
      if (pipelineErr) {
        // Speakers row landed but pipeline row failed — surface the
        // partial state so the user can recover (e.g. re-import or
        // edit on the Speakers page).
        throw new Error(`Imported to library but failed to add to pipeline: ${pipelineErr.message}`)
      }
      setImportMsg('Added to your chapter pipeline. Open Speakers to set stage and fees.')
    } catch (e) {
      setImportMsg(e.message || 'Failed to import.')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading speaker…
      </div>
    )
  }
  if (!speaker) {
    return (
      <div className="space-y-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/library/speakers')}>
          <ArrowLeft className="h-4 w-4" /> Back to library
        </Button>
        <p className="text-sm text-muted-foreground">Speaker not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          to="/library/speakers"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to library
        </Link>
      </div>

      {/* Header card */}
      <div className="rounded-xl border bg-card p-5 shadow-sm flex gap-5">
        <div className="shrink-0">
          {speaker.photo_url ? (
            <img src={speaker.photo_url} alt={speaker.name} className="h-28 w-28 rounded-xl object-cover bg-muted" />
          ) : (
            <div className="h-28 w-28 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 opacity-40" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-bold">{speaker.name}</h1>
              {speaker.topic && (
                <p className="text-sm text-muted-foreground mt-1">{speaker.topic}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              )}
              {canImport && (
                <Button size="sm" onClick={handleImport} disabled={importing}>
                  {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add to my pipeline
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {avg != null ? (
              <span className="inline-flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <strong>{avg.toFixed(1)}</strong>
                <span className="text-muted-foreground">({reviews.length} review{reviews.length === 1 ? '' : 's'})</span>
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No reviews yet</span>
            )}
            {speaker.eo_chapter && (
              <Badge variant="outline" className="text-[11px]">
                <Globe2 className="h-3 w-3 mr-1" /> {speaker.eo_chapter}
              </Badge>
            )}
            {speaker.class_year && (
              <Badge variant="outline" className="text-[11px]">{speaker.class_year}</Badge>
            )}
            {speaker.source && (
              <Badge variant="outline" className="text-[11px]">{speaker.source}</Badge>
            )}
            {speaker.source_url && (
              <a
                href={speaker.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Source
              </a>
            )}
          </div>
          {importMsg && <p className="text-xs mt-3 text-muted-foreground">{importMsg}</p>}
        </div>
      </div>

      {/* Bio + fees grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold mb-2">Bio</h2>
          {speaker.bio ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{speaker.bio}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No bio yet. {canEdit && 'Click Edit to add one — anything you add helps the next chapter that considers this speaker.'}
            </p>
          )}
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Honorarium</h3>
            <p className="text-lg font-semibold">
              {speaker.honorarium_amount != null ? formatCurrency(speaker.honorarium_amount) : <span className="text-muted-foreground text-sm font-normal italic">Unknown</span>}
            </p>
            {speaker.honorarium_notes && (
              <p className="text-xs text-muted-foreground mt-1">{speaker.honorarium_notes}</p>
            )}
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Travel</h3>
            <p className="text-lg font-semibold">
              {speaker.travel_amount != null ? formatCurrency(speaker.travel_amount) : <span className="text-muted-foreground text-sm font-normal italic">Unknown</span>}
            </p>
            {speaker.travel_notes && (
              <p className="text-xs text-muted-foreground mt-1">{speaker.travel_notes}</p>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Reviews from Learning Chairs</h2>
          {canReview && (
            <Button size="sm" variant={myReview ? 'outline' : 'default'} onClick={() => setShowReview(true)}>
              <MessageSquarePlus className="h-3.5 w-3.5" />
              {myReview ? 'Edit your review' : 'Add a review'}
            </Button>
          )}
        </div>
        {reviews.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No reviews yet. Be the first to share what worked (or didn't).</p>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => {
              const reviewer = userById[r.reviewer_user_id]
              const chapter = r.reviewer_chapter_id ? chapterById[r.reviewer_chapter_id] : null
              return (
                <div key={r.id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                    <span className="font-medium text-foreground">{reviewer?.full_name || reviewer?.email || 'Learning Chair'}</span>
                    {chapter && <span>· {chapter.name}</span>}
                    <span>· {formatDate(r.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mb-1">
                    {[1,2,3,4,5].map(n => (
                      <Star
                        key={n}
                        className={`h-3.5 w-3.5 ${n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`}
                      />
                    ))}
                  </div>
                  {r.body && <p className="text-sm whitespace-pre-wrap">{r.body}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Revision history (collapsed) */}
      <details
        className="rounded-xl border bg-card shadow-sm"
        open={showHistory}
        onToggle={(e) => setShowHistory(e.target.open)}
      >
        <summary className="flex items-center gap-2 px-5 py-3 cursor-pointer list-none">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Revision history</span>
          <span className="text-xs text-muted-foreground">— {revisions.length} edit{revisions.length === 1 ? '' : 's'}</span>
        </summary>
        <div className="border-t border-border divide-y divide-border">
          {revisions.length === 0 ? (
            <p className="px-5 py-3 text-xs text-muted-foreground">No edits since this speaker was added.</p>
          ) : revisions.map(rev => {
            const editor = userById[rev.editor_user_id]
            const chapter = rev.editor_chapter_id ? chapterById[rev.editor_chapter_id] : null
            const fields = Object.keys(rev.changes || {})
            return (
              <div key={rev.id} className="px-5 py-3 text-xs space-y-1">
                <div className="text-muted-foreground">
                  <strong className="text-foreground">{editor?.full_name || editor?.email || 'Unknown'}</strong>
                  {chapter && <span> · {chapter.name}</span>}
                  <span> · {formatDate(rev.changed_at)}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {fields.map(f => (
                    <Badge key={f} variant="outline" className="text-[10px]">
                      {FIELD_LABELS[f] || f}
                    </Badge>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </details>

      {showEdit && (
        <EditLibrarySpeakerDialog
          open={showEdit}
          onClose={() => setShowEdit(false)}
          speaker={speaker}
          onSaved={(updated) => {
            setSpeaker(updated)
            setShowEdit(false)
            // Re-fetch revisions so the new edit shows up.
            fetchAll()
          }}
        />
      )}
      {showReview && (
        <ReviewDialog
          open={showReview}
          onClose={() => setShowReview(false)}
          speakerId={speaker.id}
          existing={myReview}
          onSaved={() => {
            setShowReview(false)
            fetchAll()
          }}
        />
      )}
    </div>
  )
}

// Inline review dialog — small enough not to deserve its own file yet.
function ReviewDialog({ open, onClose, speakerId, existing, onSaved }) {
  const { profile } = useAuth()
  const [rating, setRating] = useState(existing?.rating || 5)
  const [body, setBody] = useState(existing?.body || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    setRating(existing?.rating || 5)
    setBody(existing?.body || '')
  }, [existing])

  const handleSave = async () => {
    setErr('')
    setSaving(true)
    try {
      if (existing) {
        const { error } = await supabase
          .from('public_speaker_reviews')
          .update({ rating, body })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('public_speaker_reviews')
          .insert({
            public_speaker_id: speakerId,
            reviewer_user_id: profile.id,
            rating,
            body,
          })
        if (error) throw error
      }
      onSaved?.()
    } catch (e) {
      setErr(e.message || 'Failed to save review.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existing) return
    if (!confirm('Delete your review?')) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('public_speaker_reviews')
        .delete()
        .eq('id', existing.id)
      if (error) throw error
      onSaved?.()
    } catch (e) {
      setErr(e.message || 'Failed to delete review.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit your review' : 'Add a review'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Rating</Label>
            <div className="flex items-center gap-1 mt-1">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="p-1"
                  title={`${n} star${n === 1 ? '' : 's'}`}
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40 hover:text-amber-400/60'}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="review-body">Notes (visible to all Learning Chairs)</Label>
            <Textarea
              id="review-body"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder="What worked, what didn't, audience reaction, when this speaker is the right fit, what to watch out for."
            />
          </div>
        </div>
        {err && <p className="text-xs text-destructive mt-2">{err}</p>}
        <div className="flex justify-between mt-4">
          <div>
            {existing && (
              <Button variant="outline" size="sm" onClick={handleDelete} disabled={saving}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
