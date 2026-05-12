import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import {
  BookOpen, Search, Star, Plus, Image as ImageIcon, FileText, DollarSign,
  Globe2, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/lib/pageHeader'
import { useFormatCurrency } from '@/lib/useFormatCurrency'
import AddLibrarySpeakerDialog from '@/components/library/AddLibrarySpeakerDialog'

// The Public Speaker Library — cross-chapter, shared catalog. Seeded
// from the EO Global Speakers Academy, grown by Learning Chairs over
// time. Read-only browsing for any LC-style role (incl. Regional
// Learning Chair Expert); writes gated by canEditSpeakerLibrary /
// canReviewSpeakers / canImportFromLibrary in permissions.js.
//
// V1 surface goal: make this useful from day one with 92 speakers,
// so filters are ambitious — name/topic search, EO chapter, class
// year, minimum rating, honorarium range, completeness flags.
export default function SpeakerLibraryPage() {
  const { effectiveRole } = useAuth()
  const canEdit = hasPermission(effectiveRole, 'canEditSpeakerLibrary')
  const formatCurrency = useFormatCurrency()

  const [speakers, setSpeakers] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  // Filter state
  const [search, setSearch] = useState('')
  const [chapterFilter, setChapterFilter] = useState('')
  const [classYearFilter, setClassYearFilter] = useState('')
  const [minRating, setMinRating] = useState('0')
  const [feeBucket, setFeeBucket] = useState('any')
  const [completeness, setCompleteness] = useState('any')
  const [sortBy, setSortBy] = useState('name_asc')

  const fetchAll = useCallback(async () => {
    if (!isSupabaseConfigured()) { setLoading(false); return }
    setLoading(true)
    const [{ data: spkRows }, { data: revRows }] = await Promise.all([
      supabase
        .from('public_speakers')
        .select('id,name,topic,eo_chapter,class_year,source,source_url,bio,photo_url,honorarium_amount,travel_amount,created_at,updated_at')
        .order('name'),
      supabase
        .from('public_speaker_reviews')
        .select('public_speaker_id,rating'),
    ])
    setSpeakers(spkRows || [])
    setReviews(revRows || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Aggregate review stats per speaker
  const ratingByspeaker = useMemo(() => {
    const map = new Map()
    for (const r of reviews) {
      const cur = map.get(r.public_speaker_id) || { sum: 0, count: 0 }
      cur.sum += r.rating
      cur.count += 1
      map.set(r.public_speaker_id, cur)
    }
    return map
  }, [reviews])

  // Distinct dropdown values from the data itself — no hard-coded lists.
  const chapterOptions = useMemo(() => {
    const set = new Set()
    for (const s of speakers) {
      const c = (s.eo_chapter || '').trim()
      if (c) set.add(c)
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [speakers])

  const classYearOptions = useMemo(() => {
    const set = new Set()
    for (const s of speakers) {
      const c = (s.class_year || '').trim()
      if (c) set.add(c)
    }
    return [...set].sort()
  }, [speakers])

  // Fee bucket → predicate. Honorarium-based.
  const feePredicate = useCallback((amount) => {
    if (feeBucket === 'any') return true
    const a = Number(amount)
    if (feeBucket === 'unknown') return amount == null
    if (Number.isNaN(a)) return false
    if (feeBucket === 'under5k')  return a > 0 && a < 5000
    if (feeBucket === '5to10k')   return a >= 5000 && a < 10000
    if (feeBucket === '10to25k')  return a >= 10000 && a < 25000
    if (feeBucket === '25kplus')  return a >= 25000
    return true
  }, [feeBucket])

  const completenessPredicate = useCallback((s) => {
    if (completeness === 'any') return true
    const hasPhoto = !!(s.photo_url || '').trim()
    const hasBio = !!(s.bio || '').trim()
    const hasFee = s.honorarium_amount != null
    if (completeness === 'has_photo') return hasPhoto
    if (completeness === 'has_bio') return hasBio
    if (completeness === 'has_fee') return hasFee
    if (completeness === 'fully_filled') return hasPhoto && hasBio && hasFee
    if (completeness === 'needs_info') return !hasPhoto || !hasBio || !hasFee
    return true
  }, [completeness])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const min = Number(minRating) || 0

    let result = speakers.filter(s => {
      // Search across name + topic
      if (q) {
        const inName = (s.name || '').toLowerCase().includes(q)
        const inTopic = (s.topic || '').toLowerCase().includes(q)
        if (!inName && !inTopic) return false
      }
      if (chapterFilter && s.eo_chapter !== chapterFilter) return false
      if (classYearFilter && s.class_year !== classYearFilter) return false
      if (!feePredicate(s.honorarium_amount)) return false
      if (!completenessPredicate(s)) return false
      if (min > 0) {
        const stat = ratingByspeaker.get(s.id)
        const avg = stat && stat.count > 0 ? stat.sum / stat.count : 0
        if (avg < min) return false
      }
      return true
    })

    const cmp = {
      name_asc:    (a, b) => (a.name || '').localeCompare(b.name || ''),
      name_desc:   (a, b) => (b.name || '').localeCompare(a.name || ''),
      rating_desc: (a, b) => {
        const sa = ratingByspeaker.get(a.id), sb = ratingByspeaker.get(b.id)
        const aa = sa && sa.count > 0 ? sa.sum / sa.count : 0
        const bb = sb && sb.count > 0 ? sb.sum / sb.count : 0
        return bb - aa
      },
      reviews_desc: (a, b) => {
        const sa = ratingByspeaker.get(a.id), sb = ratingByspeaker.get(b.id)
        return ((sb?.count || 0) - (sa?.count || 0))
      },
      newest:       (a, b) => new Date(b.created_at) - new Date(a.created_at),
      recently_updated: (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
    }[sortBy] || ((a, b) => 0)

    return result.sort(cmp)
  }, [speakers, search, chapterFilter, classYearFilter, feePredicate, completenessPredicate, minRating, ratingByspeaker, sortBy])

  const clearAll = () => {
    setSearch(''); setChapterFilter(''); setClassYearFilter('')
    setMinRating('0'); setFeeBucket('any'); setCompleteness('any')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader
          title="Speaker Library"
          subtitle={`${speakers.length} speakers in the public library — seeded from the EO Global Speakers Academy and grown by Learning Chairs across the network.`}
        />
        {canEdit && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add Speaker
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or topic"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={chapterFilter} onChange={e => setChapterFilter(e.target.value)}>
            <option value="">All EO chapters</option>
            {chapterOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={classYearFilter} onChange={e => setClassYearFilter(e.target.value)}>
            <option value="">All class years</option>
            {classYearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select value={minRating} onChange={e => setMinRating(e.target.value)}>
            <option value="0">Any rating</option>
            <option value="3">3★ and up</option>
            <option value="4">4★ and up</option>
            <option value="4.5">4.5★ and up</option>
          </Select>
          <Select value={feeBucket} onChange={e => setFeeBucket(e.target.value)}>
            <option value="any">Any honorarium</option>
            <option value="unknown">Unknown</option>
            <option value="under5k">Under $5,000</option>
            <option value="5to10k">$5,000 – $10,000</option>
            <option value="10to25k">$10,000 – $25,000</option>
            <option value="25kplus">$25,000+</option>
          </Select>
          <Select value={completeness} onChange={e => setCompleteness(e.target.value)}>
            <option value="any">Any completeness</option>
            <option value="has_photo">Has photo</option>
            <option value="has_bio">Has bio</option>
            <option value="has_fee">Has honorarium</option>
            <option value="fully_filled">Fully filled (photo + bio + fee)</option>
            <option value="needs_info">Needs info</option>
          </Select>
          <Select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="name_asc">Sort: Name (A→Z)</option>
            <option value="name_desc">Sort: Name (Z→A)</option>
            <option value="rating_desc">Sort: Rating (high → low)</option>
            <option value="reviews_desc">Sort: Most reviewed</option>
            <option value="newest">Sort: Newest</option>
            <option value="recently_updated">Sort: Recently updated</option>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {speakers.length} match
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading library…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No speakers match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const stat = ratingByspeaker.get(s.id)
            const avg = stat && stat.count > 0 ? stat.sum / stat.count : null
            return (
              <Link
                key={s.id}
                to={`/library/speakers/${s.id}`}
                className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md hover:border-primary transition-all flex gap-3 group"
              >
                <div className="shrink-0">
                  {s.photo_url ? (
                    <img
                      src={s.photo_url}
                      alt={s.name}
                      className="h-16 w-16 rounded-lg object-cover bg-muted"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6 opacity-40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                      {s.name}
                    </h3>
                    {avg != null && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground shrink-0">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {avg.toFixed(1)}
                        <span className="ml-0.5">({stat.count})</span>
                      </span>
                    )}
                  </div>
                  {s.topic && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1.5">
                      {s.topic}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {s.eo_chapter && (
                      <Badge variant="outline" className="text-[10px]">
                        <Globe2 className="h-2.5 w-2.5 mr-0.5" /> {s.eo_chapter}
                      </Badge>
                    )}
                    {s.class_year && (
                      <Badge variant="outline" className="text-[10px]">
                        {s.class_year}
                      </Badge>
                    )}
                    {s.honorarium_amount != null && (
                      <Badge variant="outline" className="text-[10px]">
                        <DollarSign className="h-2.5 w-2.5" />
                        {formatCurrency(s.honorarium_amount)}
                      </Badge>
                    )}
                    {!s.bio && (
                      <Badge className="text-[10px] bg-muted text-muted-foreground">
                        <FileText className="h-2.5 w-2.5 mr-0.5" /> needs bio
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddLibrarySpeakerDialog
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onSaved={(newSpeaker) => {
            setSpeakers(prev => [newSpeaker, ...prev])
            setShowAdd(false)
          }}
        />
      )}
    </div>
  )
}
