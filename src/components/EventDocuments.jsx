import { useState, useRef, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { getSignedDownloadUrl } from '@/lib/db'
import { DOCUMENT_TYPES, MAX_FILE_SIZE_MB, ALLOWED_FILE_TYPES } from '@/lib/constants'
import {
  Upload,
  FileText,
  Download,
  Trash2,
  X,
  Loader2,
  Paperclip,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Circle,
} from 'lucide-react'

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getTypeLabel(typeId) {
  return DOCUMENT_TYPES.find(t => t.id === typeId)?.label ?? 'Other'
}

function getTypeColor(typeId) {
  return DOCUMENT_TYPES.find(t => t.id === typeId)?.color ?? '#64648c'
}

function isAllowedType(file) {
  return ALLOWED_FILE_TYPES.includes(file.type)
}

function isAllowedSize(file) {
  return file.size <= MAX_FILE_SIZE_MB * 1024 * 1024
}

export default function EventDocuments({ eventId }) {
  const {
    eventDocuments,
    addEventDocument,
    updateEventDocument,
    deleteEventDocument,
  } = useStore()

  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [selectedType, setSelectedType] = useState('contract')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [downloading, setDownloading] = useState(null)
  const fileInputRef = useRef(null)
  const [parsing, setParsing] = useState(null) // doc id being parsed

  const docs = eventDocuments.filter(d => d.event_id === eventId)

  const parseContract = useCallback(async (doc) => {
    if (!doc?.storage_path || !doc?.id) return

    setParsing(doc.id)
    try {
      const signedUrl = await getSignedDownloadUrl('event-documents', doc.storage_path)
      if (!signedUrl) {
        setUploadError('Could not get download URL for parsing.')
        return
      }

      const response = await fetch('/api/contracts/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedUrl,
          fileName: doc.file_name,
          mimeType: doc.mime_type,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        setUploadError(err.error || 'Contract parsing failed.')
        return
      }

      const { items } = await response.json()
      updateEventDocument(doc.id, {
        ai_action_items: items,
        ai_parsed_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Contract parse error:', err)
      setUploadError('Failed to analyze contract.')
    } finally {
      setParsing(null)
    }
  }, [updateEventDocument])

  const handleFiles = useCallback(async (files) => {
    setUploadError(null)

    for (const file of files) {
      if (!isAllowedType(file)) {
        setUploadError(`"${file.name}" is not a supported file type. Use PDF, Word, JPEG, or PNG.`)
        return
      }
      if (!isAllowedSize(file)) {
        setUploadError(`"${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`)
        return
      }

      const uploadedDoc = await addEventDocument(
        { event_id: eventId, document_type: selectedType },
        file,
      )

      // Auto-trigger AI parsing for contract-type documents
      if (uploadedDoc && selectedType === 'contract') {
        parseContract(uploadedDoc)
      }
    }
  }, [eventId, selectedType, addEventDocument, parseContract])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) handleFiles(files)
  }, [handleFiles])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) handleFiles(files)
    e.target.value = ''
  }, [handleFiles])

  const handleDownload = useCallback(async (doc) => {
    setDownloading(doc.id)
    try {
      const signedUrl = await getSignedDownloadUrl('event-documents', doc.storage_path)
      if (!signedUrl) {
        console.error('Failed to get download URL')
        return
      }
      window.open(signedUrl, '_blank')
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(null)
    }
  }, [])

  const handleDelete = useCallback((id) => {
    deleteEventDocument(id)
    setConfirmDelete(null)
  }, [deleteEventDocument])

  const toggleActionItem = useCallback((doc, index) => {
    const items = [...(doc.ai_action_items || [])]
    items[index] = { ...items[index], done: !items[index].done }
    updateEventDocument(doc.id, { ai_action_items: items })
  }, [updateEventDocument])

  const ActionItems = ({ doc }) => {
    const items = doc.ai_action_items
    if (!items || items.length === 0) return null

    const completed = items.filter(i => i.done).length
    const total = items.length

    // Group items by category
    const grouped = {}
    items.forEach((item, idx) => {
      const cat = item.category || 'Other'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push({ ...item, _idx: idx })
    })

    return (
      <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-indigo-900">Coordinator Requirements</span>
            <span className="text-xs text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">
              {completed}/{total}
            </span>
          </div>
          <button
            onClick={() => parseContract(doc)}
            disabled={parsing === doc.id}
            className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
            title="Re-analyze contract"
          >
            <RotateCcw className={`w-3 h-3 ${parsing === doc.id ? 'animate-spin' : ''}`} />
            Re-parse
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
          />
        </div>

        {Object.entries(grouped).map(([category, categoryItems]) => (
          <div key={category} className="mb-3 last:mb-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1.5">{category}</p>
            <div className="space-y-1.5">
              {categoryItems.map(item => (
                <button
                  key={item._idx}
                  onClick={() => toggleActionItem(doc, item._idx)}
                  className={`flex items-start gap-2 w-full text-left p-2 rounded-md transition-colors cursor-pointer ${
                    item.done
                      ? 'bg-green-50 text-green-700'
                      : 'hover:bg-background text-gray-700'
                  }`}
                >
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                  )}
                  <span className={`text-sm ${item.done ? 'line-through opacity-60' : ''}`}>
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {doc.ai_parsed_at && (
          <p className="text-[10px] text-indigo-300 mt-3 text-right">
            Analyzed {new Date(doc.ai_parsed_at).toLocaleDateString()}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
        <Paperclip className="w-4 h-4" />
        Documents
        {docs.length > 0 && (
          <span className="bg-eo-blue/20 text-eo-blue text-xs px-2 py-0.5 rounded-full">
            {docs.length}
          </span>
        )}
      </h3>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? 'border-eo-blue bg-eo-blue/10'
            : 'border-border hover:border-muted-foreground/30'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground mb-3">
          Drag and drop files here, or{' '}
          <button
            onClick={handleBrowse}
            className="text-eo-blue hover:underline font-medium"
          >
            browse
          </button>
        </p>

        <div className="flex items-center justify-center gap-3 mb-2">
          <label className="text-xs text-muted-foreground">Type:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs bg-muted border border-border rounded px-2 py-1 text-foreground"
          >
            {DOCUMENT_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-muted-foreground/40">
          PDF, Word, JPEG, PNG - max {MAX_FILE_SIZE_MB}MB
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_FILE_TYPES.join(',')}
          onChange={handleFileInput}
          className="hidden"
          multiple
        />
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
          <X className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Document list */}
      {docs.length > 0 && (
        <div className="mt-4 space-y-2">
          {docs.map(doc => (
            <div key={doc.id}>
              <div
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                {/* Type badge */}
                <span
                  className="text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0"
                  style={{ backgroundColor: getTypeColor(doc.document_type) + '20', color: getTypeColor(doc.document_type) }}
                >
                  {getTypeLabel(doc.document_type)}
                </span>

                {/* File icon + name */}
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.file_size)}
                    {doc.created_at && (
                      <> - {new Date(doc.created_at).toLocaleDateString()}</>
                    )}
                  </p>
                </div>

                {/* Uploading indicator */}
                {doc._uploading && (
                  <Loader2 className="w-4 h-4 text-eo-blue animate-spin shrink-0" />
                )}

                {/* Parsing indicator */}
                {!doc._uploading && parsing === doc.id && (
                  <span className="flex items-center gap-1.5 text-xs text-indigo-500 shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing...
                  </span>
                )}

                {/* Parse button for contract docs without action items */}
                {!doc._uploading && parsing !== doc.id && doc.document_type === 'contract' && !doc.ai_action_items && (
                  <button
                    onClick={() => parseContract(doc)}
                    className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 shrink-0 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                    title="Analyze contract with AI"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Analyze
                  </button>
                )}

                {/* Download */}
                {!doc._uploading && (
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={downloading === doc.id}
                    className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Download"
                  >
                    {downloading === doc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                )}

                {/* Delete */}
                {!doc._uploading && confirmDelete === doc.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-xs text-eo-pink hover:text-eo-pink/80 px-2 py-1 rounded bg-eo-pink/10"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : !doc._uploading && (
                  <button
                    onClick={() => setConfirmDelete(doc.id)}
                    className="p-1.5 rounded hover:bg-eo-pink/10 text-muted-foreground hover:text-eo-pink transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Action items checklist (rendered below the document row) */}
              <ActionItems doc={doc} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
