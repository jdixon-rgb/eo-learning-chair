import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import TourTip from '@/components/TourTip'
import { PIPELINE_STAGES, CONTACT_METHODS, ALLOWED_FILE_TYPES, MAX_FILE_SIZE_MB, SPEAKER_PIPELINE_FIELDS } from '@/lib/constants'
import { useFormatCurrency, useCurrencySymbol } from '@/lib/useFormatCurrency'
import { uploadFile, deleteFile, getSignedDownloadUrl } from '@/lib/db'
import { useChapter } from '@/lib/chapter'
import { useFiscalYear } from '@/lib/fiscalYearContext'
import { formatFiscalYear } from '@/lib/fiscalYear'
import PageHeader from '@/lib/pageHeader'
import { downloadSpeakersBackup } from '@/lib/backupExport'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import SendPaymentPackageDialog from '@/components/SendPaymentPackageDialog'
import { Plus, Search, Star, GripVertical, User, CalendarDays, Play, Upload, FileText, Trash2, Download, Loader2, BookOpen, ArrowRight, Lock, LockOpen, Globe, Send } from 'lucide-react'

const emptyForm = {
  name: '', topic: '', bio: '', fee_range_low: '', fee_range_high: '',
  fee_estimated: '', fee_actual: '',
  fee_estimated_private: false, fee_actual_private: false,
  contact_email: '', contact_phone: '', agency_name: '', agency_contact: '',
  contact_method: 'direct', fit_score: 7, notes: '', sizzle_reel_url: '',
  routing_flexibility: false, multi_chapter_interest: false,
  share_scope: 'chapter_only',
  pipeline_stage: 'researching',
  deposit_amount: '', deposit_due_date: '',
  final_payment_amount: '', final_payment_due_date: '',
  payment_terms_notes: '',
  assigned_event_ids: [],
}

export default function SpeakersPage() {
  const {
    chapter, speakers, pipelineSpeakers, events,
    addSpeaker, updateSpeaker, deleteSpeaker,
    addToPipeline, updatePipelineEntry, removePipelineEntry,
    updateEvent,
  } = useStore()
  const { activeChapterId } = useChapter()
  const { effectiveRole } = useAuth()
  const canViewFees = hasPermission(effectiveRole, 'canViewSpeakerFees')
  const { activeFiscalYear } = useFiscalYear()
  const formatCurrency = useFormatCurrency()
  const currencySymbol = useCurrencySymbol()
  const [activeTab, setActiveTab] = useState('pipeline')
  const [showForm, setShowForm] = useState(false)
  const [editSpeaker, setEditSpeaker] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('kanban')
  const [dragSpeaker, setDragSpeaker] = useState(null)
  const [uploadingDoc, setUploadingDoc] = useState(null)
  const [showSendPackage, setShowSendPackage] = useState(false)
  const contractInputRef = useRef(null)
  const w9InputRef = useRef(null)

  const handleDocUpload = useCallback(async (file, docType) => {
    if (!editSpeaker?._pipeline_id) return
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      alert(`Can't upload "${file.name}": that file type isn't supported. Please upload a PDF or Word doc.`)
      return
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`"${file.name}" is too large (max ${MAX_FILE_SIZE_MB} MB).`)
      return
    }

    setUploadingDoc(docType)
    // Sanitize for storage key: Supabase rejects non-ASCII / many punctuation chars.
    // Original filename is preserved separately for display.
    const lastDot = file.name.lastIndexOf('.')
    const stem = lastDot > 0 ? file.name.slice(0, lastDot) : file.name
    const ext = lastDot > 0 ? file.name.slice(lastDot) : ''
    const safeStem = stem
      .normalize('NFKD').replace(/\p{M}/gu, '')
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'file'
    const safeExt = ext.replace(/[^A-Za-z0-9.]/g, '')
    const storagePath = `${activeChapterId}/speakers/${editSpeaker.id}/${docType}_${Date.now()}_${safeStem}${safeExt}`
    try {
      const res = await uploadFile('event-documents', storagePath, file)
      if (res?.error) {
        console.error(`${docType} upload error:`, res.error)
        alert(`Upload failed: ${res.error.message || res.error}`)
        return
      }
      const pathKey = docType === 'contract' ? 'contract_storage_path' : 'w9_storage_path'
      const nameKey = docType === 'contract' ? 'contract_file_name' : 'w9_file_name'
      updatePipelineEntry(editSpeaker._pipeline_id, { [pathKey]: storagePath, [nameKey]: file.name })
      setEditSpeaker(prev => ({ ...prev, [pathKey]: storagePath, [nameKey]: file.name }))
    } catch (err) {
      console.error(`${docType} upload failed:`, err)
      alert(`Upload failed: ${err?.message || err}`)
    } finally {
      setUploadingDoc(null)
    }
  }, [editSpeaker, activeChapterId, updatePipelineEntry])

  const handleDocDelete = useCallback(async (docType) => {
    if (!editSpeaker?._pipeline_id) return
    const pathKey = docType === 'contract' ? 'contract_storage_path' : 'w9_storage_path'
    const nameKey = docType === 'contract' ? 'contract_file_name' : 'w9_file_name'
    const path = editSpeaker[pathKey]
    if (path) deleteFile('event-documents', path).catch(() => {})
    updatePipelineEntry(editSpeaker._pipeline_id, { [pathKey]: null, [nameKey]: null })
    setEditSpeaker(prev => ({ ...prev, [pathKey]: null, [nameKey]: null }))
  }, [editSpeaker, updatePipelineEntry])

  const handleDocDownload = useCallback(async (storagePath) => {
    const url = await getSignedDownloadUrl('event-documents', storagePath)
    if (url) window.open(url, '_blank')
  }, [])

  // Map speaker → event assignment
  const speakerEventMap = {}
  events.forEach(evt => {
    const allSpeakerIds = new Set([
      ...(evt.candidate_speaker_ids || []),
      ...(evt.speaker_id ? [evt.speaker_id] : []),
    ])
    allSpeakerIds.forEach(sid => {
      if (!speakerEventMap[sid]) speakerEventMap[sid] = []
      speakerEventMap[sid].push(evt)
    })
  })

  // Pipeline speakers filtered by search
  const filteredPipeline = pipelineSpeakers.filter(s =>
    s.pipeline_stage !== 'passed' &&
    (s.name.toLowerCase().includes(search.toLowerCase()) ||
     s.topic?.toLowerCase().includes(search.toLowerCase()))
  )
  const passedPipeline = pipelineSpeakers.filter(s => s.pipeline_stage === 'passed')

  // Library speakers filtered by search
  const filteredLibrary = speakers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.topic?.toLowerCase().includes(search.toLowerCase())
  )

  // IDs of speakers already in current FY pipeline
  const pipelineSpeakerIds = new Set(pipelineSpeakers.map(p => p.id))

  const handleSubmit = async () => {
    if (!form.name) return
    const { assigned_event_ids, ...allData } = form

    // Split library vs pipeline fields
    const libraryData = {}
    const pipelineData = {}
    for (const [key, val] of Object.entries(allData)) {
      if (SPEAKER_PIPELINE_FIELDS.includes(key)) {
        pipelineData[key] = val
      } else {
        libraryData[key] = val
      }
    }

    // Parse numeric fields
    libraryData.fee_range_low = libraryData.fee_range_low ? parseFloat(libraryData.fee_range_low) : null
    libraryData.fee_range_high = libraryData.fee_range_high ? parseFloat(libraryData.fee_range_high) : null
    pipelineData.fee_estimated = pipelineData.fee_estimated ? parseFloat(pipelineData.fee_estimated) : null
    pipelineData.fee_actual = pipelineData.fee_actual ? parseFloat(pipelineData.fee_actual) : null
    pipelineData.fit_score = parseInt(pipelineData.fit_score)
    pipelineData.deposit_amount = pipelineData.deposit_amount ? parseInt(pipelineData.deposit_amount) : null
    pipelineData.final_payment_amount = pipelineData.final_payment_amount ? parseInt(pipelineData.final_payment_amount) : null
    pipelineData.deposit_due_date = pipelineData.deposit_due_date || null
    pipelineData.final_payment_due_date = pipelineData.final_payment_due_date || null

    // Denormalize source chapter name when sharing globally so other
    // chapters can attribute it without opening up cross-chapter chapters.* reads.
    libraryData.shared_chapter_name = libraryData.share_scope === 'global'
      ? (chapter?.name || null)
      : null

    let speakerId
    if (editSpeaker) {
      updateSpeaker(editSpeaker.id, libraryData)
      if (editSpeaker._pipeline_id) {
        updatePipelineEntry(editSpeaker._pipeline_id, pipelineData)
      }
      speakerId = editSpeaker.id
    } else {
      // Await both DB inserts so a quick follow-up delete can't race
      // ahead of the speaker_pipeline insert (FK violation otherwise).
      const newSpeaker = await addSpeaker({ ...libraryData, ...pipelineData })
      if (!newSpeaker) return
      speakerId = newSpeaker.id
    }

    // Sync event assignments — add/remove speaker from events based on checkboxes
    if (speakerId) {
      const selectedIds = new Set(assigned_event_ids || [])
      const mutations = []

      events.forEach(evt => {
        const candidates = evt.candidate_speaker_ids || []
        const isAssigned = candidates.includes(speakerId) || evt.speaker_id === speakerId
        const shouldBeAssigned = selectedIds.has(evt.id)

        if (isAssigned && !shouldBeAssigned) {
          // Remove from this event
          const filtered = candidates.filter(sid => sid !== speakerId)
          mutations.push([evt.id, {
            candidate_speaker_ids: filtered,
            ...(evt.speaker_id === speakerId ? { speaker_id: filtered[0] || null } : {}),
          }])
        } else if (!isAssigned && shouldBeAssigned) {
          // Add to this event
          mutations.push([evt.id, {
            candidate_speaker_ids: [...candidates, speakerId],
            ...(!evt.speaker_id ? { speaker_id: speakerId } : {}),
          }])
        }
      })

      mutations.forEach(([id, updates]) => updateEvent(id, updates))
    }

    setShowForm(false)
    setEditSpeaker(null)
    setForm(emptyForm)
  }

  const openEdit = (speaker) => {
    setEditSpeaker(speaker)
    const assignedEventIds = events
      .filter(e => (e.candidate_speaker_ids || []).includes(speaker.id) || e.speaker_id === speaker.id)
      .map(e => e.id)
    setForm({
      name: speaker.name || '',
      topic: speaker.topic || '',
      bio: speaker.bio || '',
      fee_range_low: speaker.fee_range_low || '',
      fee_range_high: speaker.fee_range_high || '',
      fee_estimated: speaker.fee_estimated || '',
      fee_actual: speaker.fee_actual || '',
      fee_estimated_private: !!speaker.fee_estimated_private,
      fee_actual_private: !!speaker.fee_actual_private,
      share_scope: speaker.share_scope || 'chapter_only',
      contact_email: speaker.contact_email || '',
      contact_phone: speaker.contact_phone || '',
      agency_name: speaker.agency_name || '',
      agency_contact: speaker.agency_contact || '',
      contact_method: speaker.contact_method || 'direct',
      fit_score: speaker.fit_score || 7,
      notes: speaker.notes || '',
      sizzle_reel_url: speaker.sizzle_reel_url || '',
      routing_flexibility: speaker.routing_flexibility || false,
      multi_chapter_interest: speaker.multi_chapter_interest || false,
      pipeline_stage: speaker.pipeline_stage || 'researching',
      deposit_amount: speaker.deposit_amount ?? '',
      deposit_due_date: speaker.deposit_due_date || '',
      final_payment_amount: speaker.final_payment_amount ?? '',
      final_payment_due_date: speaker.final_payment_due_date || '',
      payment_terms_notes: speaker.payment_terms_notes || '',
      assigned_event_ids: assignedEventIds,
    })
    setShowForm(true)
  }

  const openEditFromLibrary = (librarySpeaker) => {
    // Enrich with pipeline data if exists
    const pipelineEntry = pipelineSpeakers.find(p => p.id === librarySpeaker.id)
    openEdit(pipelineEntry || librarySpeaker)
  }

  const handleDragStart = (speaker) => setDragSpeaker(speaker)
  const handleDragOver = (e) => e.preventDefault()
  const handleDrop = (stageId) => {
    if (dragSpeaker?._pipeline_id) {
      updatePipelineEntry(dragSpeaker._pipeline_id, { pipeline_stage: stageId })
      setDragSpeaker(null)
    }
  }

  const SpeakerCard = ({ speaker }) => {
    const assignedEvents = speakerEventMap[speaker.id] || []
    return (
      <div
        draggable
        onDragStart={() => handleDragStart(speaker)}
        className="rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
        onClick={() => openEdit(speaker)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
            <h4 className="text-sm font-semibold">{speaker.name}</h4>
            {speaker.sizzle_reel_url && (
              <a
                href={speaker.sizzle_reel_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                onDragStart={e => e.stopPropagation()}
                title="Watch sizzle reel"
                className="shrink-0 w-5 h-5 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
              >
                <Play className="h-2.5 w-2.5 text-primary fill-primary" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${i < Math.ceil((speaker.fit_score || 0) / 2) ? 'text-warm fill-warm' : 'text-gray-200'}`}
              />
            ))}
          </div>
        </div>
        {assignedEvents.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {assignedEvents.map(e => {
              const isPrimary = e.speaker_id === speaker.id
              return (
                <div key={e.id} className={`flex items-center gap-1 text-xs ${isPrimary ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  <CalendarDays className="h-3 w-3 shrink-0" />
                  <span className="truncate">{e.title}</span>
                  {isPrimary && <span className="text-[9px]">★</span>}
                </div>
              )
            })}
          </div>
        )}
        {speaker.topic && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{speaker.topic}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-medium">
            {speaker.fee_range_low ? `${formatCurrency(speaker.fee_range_low)}–${formatCurrency(speaker.fee_range_high)}` : 'TBD'}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {CONTACT_METHODS.find(m => m.id === speaker.contact_method)?.label || 'Direct'}
          </Badge>
        </div>
        {/* Inline estimated / actual fee inputs — hidden from roles that
            shouldn't see specific negotiated amounts (e.g. regional expert).
            Those viewers still see the public fee_range above. */}
        {canViewFees && (
          <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t" onClick={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()}>
            <InlineFeeInput
              label={<>Estimated{speaker.fee_estimated_private && <Lock className="inline h-2.5 w-2.5 ml-1 text-warm" />}</>}
              value={speaker.fee_estimated}
              onSave={val => speaker._pipeline_id && updatePipelineEntry(speaker._pipeline_id, { fee_estimated: val })}
            />
            <InlineFeeInput
              label={<>Actual{speaker.fee_actual_private && <Lock className="inline h-2.5 w-2.5 ml-1 text-warm" />}</>}
              value={speaker.fee_actual}
              onSave={val => speaker._pipeline_id && updatePipelineEntry(speaker._pipeline_id, { fee_actual: val })}
            />
          </div>
        )}
        {speaker.notes && (
          <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 border-t pt-2">{speaker.notes}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TourTip />
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader
          title="Speakers"
          subtitle={
            activeTab === 'pipeline'
              ? `${pipelineSpeakers.filter(s => s.pipeline_stage !== 'passed').length} in pipeline · ${formatFiscalYear(activeFiscalYear)}`
              : `${speakers.length} speakers in library`
          }
        />
        <div className="flex gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search speakers..."
              className="pl-9 w-60"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {activeTab === 'pipeline' && (
            <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}>
              {viewMode === 'kanban' ? 'List View' : 'Kanban View'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            title="Download a chapter-scoped XLSX backup of your speaker library + current FY pipeline"
            onClick={() => downloadSpeakersBackup({
              chapterName: chapter?.name,
              speakers,
              pipelineSpeakers,
              fiscalYear: formatFiscalYear(activeFiscalYear),
            })}
          >
            <Download className="h-4 w-4" /> Backup
          </Button>
          <Button size="sm" onClick={() => { setEditSpeaker(null); setForm(emptyForm); setShowForm(true) }}>
            <Plus className="h-4 w-4" /> Add Speaker
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pipeline'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Pipeline
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'library'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Library
        </button>
        <button
          onClick={() => setActiveTab('shared')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'shared'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          Shared Library
        </button>
      </div>

      {activeTab === 'pipeline' ? (
        <>
          {/* Kanban View */}
          {viewMode === 'kanban' ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {PIPELINE_STAGES.map(stage => {
                const stageSpeakers = filteredPipeline.filter(s => s.pipeline_stage === stage.id)
                return (
                  <div
                    key={stage.id}
                    className="flex-shrink-0 w-64"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(stage.id)}
                  >
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="text-sm font-semibold">{stage.label}</span>
                      <span className="text-xs text-muted-foreground">({stageSpeakers.length})</span>
                    </div>
                    <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/30 p-2">
                      {stageSpeakers.map(speaker => (
                        <SpeakerCard key={speaker.id} speaker={speaker} />
                      ))}
                      {stageSpeakers.length === 0 && (
                        <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                          Drag speakers here
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* List View */
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Speaker</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Topic</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Fee Range</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Estimated</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actual</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Fit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Stage</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPipeline.map(speaker => (
                    <tr key={speaker.id} className="border-b hover:bg-accent/50 cursor-pointer" onClick={() => openEdit(speaker)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium">{speaker.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{speaker.topic}</td>
                      <td className="px-4 py-3 text-sm">
                        {speaker.fee_range_low ? `${formatCurrency(speaker.fee_range_low)}–${formatCurrency(speaker.fee_range_high)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {canViewFees ? (
                          <span className="inline-flex items-center gap-1">
                            {speaker.fee_estimated ? formatCurrency(speaker.fee_estimated) : '—'}
                            {speaker.fee_estimated_private && <Lock className="h-3 w-3 text-warm" title="Private — speaker requested confidentiality" />}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            <span className="text-xs">Private</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {canViewFees ? (
                          <span className="inline-flex items-center gap-1">
                            {speaker.fee_actual ? formatCurrency(speaker.fee_actual) : '—'}
                            {speaker.fee_actual_private && <Lock className="h-3 w-3 text-warm" title="Private — speaker requested confidentiality" />}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            <span className="text-xs">Private</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-warm fill-warm" />
                          <span className="text-sm">{speaker.fit_score}/10</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: PIPELINE_STAGES.find(s => s.id === speaker.pipeline_stage)?.color }}>
                          {PIPELINE_STAGES.find(s => s.id === speaker.pipeline_stage)?.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {CONTACT_METHODS.find(m => m.id === speaker.contact_method)?.label}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Passed Speakers Archive */}
          {passedPipeline.length > 0 && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Passed ({passedPipeline.length})</h3>
              <div className="flex flex-wrap gap-2">
                {passedPipeline.map(s => (
                  <Badge key={s.id} variant="secondary" className="cursor-pointer" onClick={() => openEdit(s)}>
                    {s.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      ) : activeTab === 'library' ? (
        /* Library Tab */
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Speaker</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Topic</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Fee Range</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Pipeline</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLibrary.map(speaker => {
                const inPipeline = pipelineSpeakerIds.has(speaker.id)
                return (
                  <tr key={speaker.id} className="border-b hover:bg-accent/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => openEditFromLibrary(speaker)}>
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <span className="text-sm font-medium hover:text-primary">{speaker.name}</span>
                          {speaker.sizzle_reel_url && (
                            <a href={speaker.sizzle_reel_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="ml-1.5">
                              <Play className="inline h-3 w-3 text-primary" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">{speaker.topic}</td>
                    <td className="px-4 py-3 text-sm">
                      {speaker.fee_range_low ? `${formatCurrency(speaker.fee_range_low)}–${formatCurrency(speaker.fee_range_high)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {CONTACT_METHODS.find(m => m.id === speaker.contact_method)?.label}
                    </td>
                    <td className="px-4 py-3">
                      {inPipeline ? (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-500/30">
                          In Pipeline
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!inPipeline && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            addToPipeline(speaker.id)
                            setActiveTab('pipeline')
                          }}
                        >
                          <ArrowRight className="h-3 w-3 mr-1" />
                          Add to Pipeline
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filteredLibrary.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No speakers in the library yet. Add speakers through the Pipeline tab.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Shared Library Tab */
        <SharedLibraryTab
          activeChapterId={activeChapterId}
          ownSpeakers={speakers}
          onFork={async (sharedSpeaker) => {
            // Strip metadata fields and copy library-eligible fields into our chapter
            const { id, chapter_id, share_scope, shared_chapter_name, imported_from_speaker_id, created_at, updated_at, ...copyable } = sharedSpeaker
            await addSpeaker({
              ...copyable,
              imported_from_speaker_id: sharedSpeaker.id,
              share_scope: 'chapter_only',
              shared_chapter_name: null,
              pipeline_stage: 'researching',
            })
          }}
        />
      )}

      {/* Add/Edit Speaker Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editSpeaker ? 'Edit Speaker' : 'Add Speaker'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium">Name *</label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Speaker name" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium">Topic / Expertise</label>
                <Input value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))} placeholder="AI, Leadership, etc." />
              </div>
              <div>
                <label className="text-xs font-medium">Fee Low ({currencySymbol})</label>
                <Input type="number" value={form.fee_range_low} onChange={e => setForm(p => ({ ...p, fee_range_low: e.target.value }))} placeholder="15000" />
              </div>
              <div>
                <label className="text-xs font-medium">Fee High ({currencySymbol})</label>
                <Input type="number" value={form.fee_range_high} onChange={e => setForm(p => ({ ...p, fee_range_high: e.target.value }))} placeholder="25000" />
              </div>

              {/* Pipeline-specific fields */}
              {(editSpeaker?._pipeline_id || !editSpeaker) && (
                <>
                  <div className="col-span-2">
                    <label className="text-xs font-medium">Pipeline Stage</label>
                    <Select value={form.pipeline_stage} onChange={e => setForm(p => ({ ...p, pipeline_stage: e.target.value }))}>
                      {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      <option value="passed">Passed</option>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Touch-screen friendly alternative to dragging cards between columns.
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium">Estimated Fee ({currencySymbol})</label>
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, fee_estimated_private: !p.fee_estimated_private }))}
                        title={form.fee_estimated_private ? 'Estimated fee is private — click to make visible' : 'Estimated fee is visible — click to mark private (e.g. speaker requested confidentiality)'}
                        className={`flex items-center gap-1 text-[10px] cursor-pointer rounded px-1.5 py-0.5 ${form.fee_estimated_private ? 'bg-warm/15 text-warm' : 'text-muted-foreground hover:bg-accent'}`}
                      >
                        {form.fee_estimated_private ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                        {form.fee_estimated_private ? 'Private' : 'Public'}
                      </button>
                    </div>
                    <Input type="number" value={form.fee_estimated} onChange={e => setForm(p => ({ ...p, fee_estimated: e.target.value }))} placeholder="Negotiated estimate" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium">Actual Fee ({currencySymbol})</label>
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, fee_actual_private: !p.fee_actual_private }))}
                        title={form.fee_actual_private ? 'Actual fee is private — click to make visible' : 'Actual fee is visible — click to mark private (e.g. speaker requested confidentiality)'}
                        className={`flex items-center gap-1 text-[10px] cursor-pointer rounded px-1.5 py-0.5 ${form.fee_actual_private ? 'bg-warm/15 text-warm' : 'text-muted-foreground hover:bg-accent'}`}
                      >
                        {form.fee_actual_private ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                        {form.fee_actual_private ? 'Private' : 'Public'}
                      </button>
                    </div>
                    <Input type="number" value={form.fee_actual} onChange={e => setForm(p => ({ ...p, fee_actual: e.target.value }))} placeholder="Final amount paid" />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-medium">Contact Method</label>
                <Select value={form.contact_method} onChange={e => setForm(p => ({ ...p, contact_method: e.target.value }))}>
                  {CONTACT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Fit Score (1-10)</label>
                <Input type="number" min="1" max="10" value={form.fit_score} onChange={e => setForm(p => ({ ...p, fit_score: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium">Email</label>
                <Input value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} placeholder="speaker@email.com" />
              </div>
              <div>
                <label className="text-xs font-medium">Phone</label>
                <Input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))} placeholder="(555) 123-4567" />
              </div>
              {form.contact_method === 'agency' && (
                <>
                  <div>
                    <label className="text-xs font-medium">Agency Name</label>
                    <Input value={form.agency_name} onChange={e => setForm(p => ({ ...p, agency_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Agency Contact</label>
                    <Input value={form.agency_contact} onChange={e => setForm(p => ({ ...p, agency_contact: e.target.value }))} />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <label className="text-xs font-medium">Bio</label>
                <Textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Brief bio..." rows={2} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium">Sizzle Reel URL</label>
                <Input value={form.sizzle_reel_url} onChange={e => setForm(p => ({ ...p, sizzle_reel_url: e.target.value }))} placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..." />
              </div>
              <div className="col-span-2 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, share_scope: p.share_scope === 'global' ? 'chapter_only' : 'global' }))}
                    className={`shrink-0 mt-0.5 px-2 py-1 rounded text-xs font-medium cursor-pointer flex items-center gap-1 ${form.share_scope === 'global' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-white text-muted-foreground border border-border hover:bg-accent'}`}
                  >
                    {form.share_scope === 'global' ? <BookOpen className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {form.share_scope === 'global' ? 'Globally Shared' : 'Chapter Only'}
                  </button>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {form.share_scope === 'global'
                      ? 'Other chapters can see this speaker in their Shared Library and fork a copy into their own pipeline. Your pipeline data (fees, notes, status) stays private to your chapter.'
                      : 'Only your chapter sees this speaker. Toggle on to let other chapters discover and fork them.'}
                  </div>
                </div>
              </div>

              {/* Payment Terms — only when pipeline entry exists */}
              {editSpeaker?._pipeline_id && (
                <div className="col-span-2 space-y-3 pt-2 border-t">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Terms</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Deposit ({currencySymbol})</label>
                      <Input type="number" value={form.deposit_amount} onChange={e => setForm(p => ({ ...p, deposit_amount: e.target.value }))} placeholder="e.g. 7500" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Deposit due</label>
                      <Input type="date" value={form.deposit_due_date} onChange={e => setForm(p => ({ ...p, deposit_due_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Final payment ({currencySymbol})</label>
                      <Input type="number" value={form.final_payment_amount} onChange={e => setForm(p => ({ ...p, final_payment_amount: e.target.value }))} placeholder="e.g. 7500" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground">Final payment due</label>
                      <Input type="date" value={form.final_payment_due_date} onChange={e => setForm(p => ({ ...p, final_payment_due_date: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground">Payment notes</label>
                    <Textarea
                      value={form.payment_terms_notes}
                      onChange={e => setForm(p => ({ ...p, payment_terms_notes: e.target.value }))}
                      placeholder="Wire instructions, payee on the W-9 if different from speaker, hotel/travel reimbursement, etc."
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Speaker Documents — only when pipeline entry exists */}
              {editSpeaker?._pipeline_id && (
                <div className="col-span-2 space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Speaker Documents</label>
                    {(editSpeaker.contract_storage_path || editSpeaker.w9_storage_path) && (
                      <button
                        type="button"
                        onClick={() => setShowSendPackage(true)}
                        className="text-[11px] text-primary hover:underline cursor-pointer flex items-center gap-1"
                        title="Email the contract, W-9, and key payment terms to the Executive Director"
                      >
                        <Send className="h-3 w-3" /> Send payment package to ED
                      </button>
                    )}
                  </div>
                  {editSpeaker.ed_package_sent_at && (
                    <p className="text-[10px] text-muted-foreground -mt-1">
                      Last sent {new Date(editSpeaker.ed_package_sent_at).toLocaleDateString()} to {editSpeaker.ed_package_sent_to}
                    </p>
                  )}
                  {/* Contract */}
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="text-xs font-medium w-16 shrink-0">Contract</span>
                    {editSpeaker.contract_storage_path ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs text-muted-foreground truncate flex-1">{editSpeaker.contract_file_name}</span>
                        <button type="button" onClick={() => handleDocDownload(editSpeaker.contract_storage_path)} className="text-indigo-500 hover:text-indigo-700 p-1 cursor-pointer"><Download className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => handleDocDelete('contract')} className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : uploadingDoc === 'contract' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    ) : (
                      <button type="button" onClick={() => contractInputRef.current?.click()} className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 cursor-pointer">
                        <Upload className="h-3.5 w-3.5" /> Upload
                      </button>
                    )}
                    <input ref={contractInputRef} type="file" accept={ALLOWED_FILE_TYPES.join(',')} className="hidden" onChange={e => { if (e.target.files[0]) handleDocUpload(e.target.files[0], 'contract'); e.target.value = '' }} />
                  </div>
                  {/* W-9 */}
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-xs font-medium w-16 shrink-0">W-9</span>
                    {editSpeaker.w9_storage_path ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs text-muted-foreground truncate flex-1">{editSpeaker.w9_file_name}</span>
                        <button type="button" onClick={() => handleDocDownload(editSpeaker.w9_storage_path)} className="text-green-500 hover:text-green-700 p-1 cursor-pointer"><Download className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => handleDocDelete('w9')} className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : uploadingDoc === 'w9' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                    ) : (
                      <button type="button" onClick={() => w9InputRef.current?.click()} className="text-xs text-green-500 hover:text-green-700 flex items-center gap-1 cursor-pointer">
                        <Upload className="h-3.5 w-3.5" /> Upload
                      </button>
                    )}
                    <input ref={w9InputRef} type="file" accept={ALLOWED_FILE_TYPES.join(',')} className="hidden" onChange={e => { if (e.target.files[0]) handleDocUpload(e.target.files[0], 'w9'); e.target.value = '' }} />
                  </div>
                </div>
              )}

              <div className="col-span-2">
                <label className="text-xs font-medium">Notes</label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Negotiation strategy, referral source, etc." rows={3} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium">Event Assignments</label>
                <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto border rounded-lg p-2 bg-background">
                  {[...events].sort((a, b) => (a.month_index ?? 99) - (b.month_index ?? 99)).map(evt => {
                    const checked = (form.assigned_event_ids || []).includes(evt.id)
                    const isPrimary = evt.speaker_id && editSpeaker && evt.speaker_id === editSpeaker.id
                    return (
                      <label key={evt.id} className="flex items-center gap-2 text-xs py-0.5 cursor-pointer hover:bg-accent/50 rounded px-1">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const ids = form.assigned_event_ids || []
                            setForm(p => ({
                              ...p,
                              assigned_event_ids: e.target.checked
                                ? [...ids, evt.id]
                                : ids.filter(id => id !== evt.id),
                            }))
                          }}
                        />
                        <span className={isPrimary ? 'font-semibold text-primary' : ''}>
                          {evt.title}
                        </span>
                        {isPrimary && <span className="text-[9px] text-primary">★ primary</span>}
                      </label>
                    )
                  })}
                  {events.length === 0 && (
                    <p className="text-xs text-muted-foreground py-1">No events created yet.</p>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Check events to add this speaker as a candidate. A speaker can be assigned to multiple events.
                </p>
              </div>
              <div className="col-span-2 flex gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.routing_flexibility} onChange={e => setForm(p => ({ ...p, routing_flexibility: e.target.checked }))} />
                  Routing flexibility (flexible dates)
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.multi_chapter_interest} onChange={e => setForm(p => ({ ...p, multi_chapter_interest: e.target.checked }))} />
                  Multi-chapter bundling interest
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} className="flex-1">{editSpeaker ? 'Save Changes' : 'Add Speaker'}</Button>
              {editSpeaker?._pipeline_id && (
                <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => {
                  if (confirm('Move this speaker to Passed?')) {
                    updatePipelineEntry(editSpeaker._pipeline_id, { pipeline_stage: 'passed' })
                    setShowForm(false)
                  }
                }}>
                  Mark Passed
                </Button>
              )}
              {editSpeaker && (
                <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => {
                  if (confirm(`Delete ${editSpeaker.name}? This removes them from the library and any event assignments.`)) {
                    deleteSpeaker(editSpeaker.id)
                    setShowForm(false)
                    setEditSpeaker(null)
                  }
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SendPaymentPackageDialog
        open={showSendPackage}
        onOpenChange={setShowSendPackage}
        speaker={editSpeaker}
        chapter={chapter}
        events={events}
        onSent={({ sentAt, sentTo }) => {
          if (editSpeaker?._pipeline_id) {
            updatePipelineEntry(editSpeaker._pipeline_id, { ed_package_sent_at: sentAt, ed_package_sent_to: sentTo })
            setEditSpeaker(prev => prev ? { ...prev, ed_package_sent_at: sentAt, ed_package_sent_to: sentTo } : prev)
          }
        }}
      />
    </div>
  )
}

// ── Shared Library Tab — globally-shared speakers from other chapters ──
function SharedLibraryTab({ activeChapterId, ownSpeakers, onFork }) {
  const [speakers, setSpeakers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [forking, setForking] = useState(null)         // speaker id being forked

  const ownImportedIds = new Set(
    ownSpeakers.filter(s => s.imported_from_speaker_id).map(s => s.imported_from_speaker_id),
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!isSupabaseConfigured()) {
        setLoading(false)
        return
      }
      setError(null)
      // Include own-chapter shared speakers so the user can confirm their
      // contribution is live and manage it from this view. We tag them
      // visually below ("Your chapter shared this") and suppress the
      // fork action since it's already in their own library.
      const { data, error: err } = await supabase
        .from('speakers')
        .select('*')
        .eq('share_scope', 'global')
        .order('name', { ascending: true })
      if (cancelled) return
      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }
      setSpeakers(data || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [activeChapterId])

  const handleFork = async (speaker) => {
    setForking(speaker.id)
    try {
      await onFork(speaker)
    } finally {
      setForking(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading shared library…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
    )
  }

  if (speakers.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        No globally-shared speakers yet. Toggle a speaker in your library to "Globally Shared" — they'll appear here for every chapter to discover and fork.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {speakers.map(speaker => {
        const isOwnContribution = speaker.chapter_id === activeChapterId
        const alreadyForked = ownImportedIds.has(speaker.id)
        return (
          <div key={speaker.id} className="rounded-xl border bg-card p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate">{speaker.name}</h3>
                {speaker.topic && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{speaker.topic}</p>}
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Globe className="h-3 w-3" />
                Shared
              </span>
            </div>
            {speaker.bio && <p className="text-xs text-muted-foreground line-clamp-3">{speaker.bio}</p>}
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">
                {speaker.fee_range_low
                  ? `${(speaker.fee_range_low / 1000).toFixed(0)}K–${(speaker.fee_range_high / 1000).toFixed(0)}K`
                  : 'Fee TBD'}
              </span>
              <span className="text-muted-foreground italic">
                {isOwnContribution
                  ? 'Your chapter'
                  : (speaker.shared_chapter_name || 'EO Chapter')}
              </span>
            </div>
            {isOwnContribution ? (
              <Button size="sm" variant="outline" disabled className="w-full">
                Your contribution — visible to other chapters
              </Button>
            ) : (
              <Button
                size="sm"
                variant={alreadyForked ? 'outline' : 'default'}
                disabled={alreadyForked || forking === speaker.id}
                onClick={() => handleFork(speaker)}
                className="w-full"
              >
                {forking === speaker.id ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Forking…</>
                ) : alreadyForked ? (
                  'Already in your library'
                ) : (
                  <><Plus className="h-3.5 w-3.5 mr-1" /> Add to my pipeline</>
                )}
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Stable helper: local state prevents unmount on every keystroke ──
function InlineFeeInput({ label, value, onSave }) {
  const [local, setLocal] = useState(value ?? '')
  const currencySymbol = useCurrencySymbol()

  useEffect(() => { setLocal(value ?? '') }, [value])

  return (
    <div>
      <label className="text-[10px] text-muted-foreground font-medium">{label}</label>
      <Input
        className="h-7 text-xs text-right"
        type="number"
        value={local}
        placeholder={currencySymbol}
        onClick={e => e.stopPropagation()}
        onDragStart={e => e.stopPropagation()}
        onChange={e => {
          e.stopPropagation()
          setLocal(e.target.value)
        }}
        onBlur={() => onSave(local ? parseFloat(local) : null)}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
      />
    </div>
  )
}
