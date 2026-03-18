import { useState, useRef, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { getSignedUrl } from '@/lib/db'
import { DOCUMENT_TYPES, MAX_FILE_SIZE_MB, ALLOWED_FILE_TYPES } from '@/lib/constants'
import {
  Upload,
  FileText,
  Download,
  Trash2,
  X,
  Loader2,
  Paperclip,
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

  const docs = eventDocuments.filter(d => d.event_id === eventId)

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

      await addEventDocument(
        { event_id: eventId, document_type: selectedType },
        file,
      )
    }
  }, [eventId, selectedType, addEventDocument])

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
      const { data, error } = await getSignedUrl('event-documents', doc.storage_path)
      if (error || !data?.signedUrl) {
        console.error('Failed to get download URL:', error)
        return
      }
      window.open(data.signedUrl, '_blank')
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

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
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
            : 'border-white/10 hover:border-white/20'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-white/30" />
        <p className="text-sm text-white/50 mb-3">
          Drag and drop files here, or{' '}
          <button
            onClick={handleBrowse}
            className="text-eo-blue hover:underline font-medium"
          >
            browse
          </button>
        </p>

        <div className="flex items-center justify-center gap-3 mb-2">
          <label className="text-xs text-white/40">Type:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white/70"
          >
            {DOCUMENT_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-white/30">
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
        <div className="mt-2 flex items-center gap-2 text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
          <X className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-auto text-red-400/60 hover:text-red-400">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Document list */}
      {docs.length > 0 && (
        <div className="mt-4 space-y-2">
          {docs.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3"
            >
              {/* Type badge */}
              <span
                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded shrink-0"
                style={{ backgroundColor: getTypeColor(doc.document_type) + '20', color: getTypeColor(doc.document_type) }}
              >
                {getTypeLabel(doc.document_type)}
              </span>

              {/* File icon + name */}
              <FileText className="w-4 h-4 text-white/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 truncate">{doc.file_name}</p>
                <p className="text-xs text-white/30">
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

              {/* Download */}
              {!doc._uploading && (
                <button
                  onClick={() => handleDownload(doc)}
                  disabled={downloading === doc.id}
                  className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
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
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-400/10"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-xs text-white/40 hover:text-white/60 px-2 py-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : !doc._uploading && (
                <button
                  onClick={() => setConfirmDelete(doc.id)}
                  className="p-1.5 rounded hover:bg-red-400/10 text-white/40 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
