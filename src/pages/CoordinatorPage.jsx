import { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardCheck,
  Calendar,
  CheckCircle2,
  Circle,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

export default function CoordinatorPage() {
  const navigate = useNavigate()
  const { events, eventDocuments, updateEventDocument } = useStore()

  // Aggregate all action items across all events, sorted by event date
  const eventItems = useMemo(() => {
    // Get all contract documents that have AI action items
    const contractDocs = eventDocuments.filter(
      d => d.document_type === 'contract' && d.ai_action_items?.length > 0
    )

    // Group by event
    const byEvent = {}
    contractDocs.forEach(doc => {
      if (!byEvent[doc.event_id]) byEvent[doc.event_id] = []
      byEvent[doc.event_id].push(doc)
    })

    // Build event entries with their action items
    return Object.entries(byEvent)
      .map(([eventId, docs]) => {
        const event = events.find(e => e.id === eventId)
        if (!event) return null

        // Flatten all action items from all contract docs for this event
        const allItems = docs.flatMap(doc =>
          (doc.ai_action_items || []).map((item, idx) => ({
            ...item,
            _docId: doc.id,
            _idx: idx,
            _fileName: doc.file_name,
          }))
        )

        const completed = allItems.filter(i => i.done).length
        const total = allItems.length

        return {
          event,
          docs,
          allItems,
          completed,
          total,
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = a.event.event_date || '9999'
        const dateB = b.event.event_date || '9999'
        return dateA.localeCompare(dateB)
      })
  }, [events, eventDocuments])

  const toggleItem = useCallback((docId, index) => {
    const doc = eventDocuments.find(d => d.id === docId)
    if (!doc?.ai_action_items) return
    const items = [...doc.ai_action_items]
    items[index] = { ...items[index], done: !items[index].done }
    updateEventDocument(docId, { ai_action_items: items })
  }, [eventDocuments, updateEventDocument])

  // Overall stats
  const totalItems = eventItems.reduce((s, e) => s + e.total, 0)
  const totalCompleted = eventItems.reduce((s, e) => s + e.completed, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Coordinator Requirements</h1>
            <p className="text-sm text-muted-foreground">
              Action items extracted from speaker contracts, by event date
            </p>
          </div>
        </div>

        {/* Overall progress */}
        {totalItems > 0 && (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${(totalCompleted / totalItems) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {totalCompleted}/{totalItems} complete
            </span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {eventItems.length === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No contract action items yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload a contract on any event's Contract tab — AI will extract the requirements automatically.
          </p>
        </div>
      )}

      {/* Event cards */}
      {eventItems.map(({ event, allItems, completed, total }) => (
        <div key={event.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {/* Event header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate(`/events/${event.id}`)}
          >
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="text-sm font-semibold">{event.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {event.event_date ? formatDate(event.event_date) : 'Date TBD'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={completed === total ? 'default' : 'outline'} className={completed === total ? 'bg-green-100 text-green-700' : ''}>
                {completed}/{total}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Action items */}
          <div className="p-4 space-y-1.5">
            {allItems.map(item => (
              <button
                key={`${item._docId}-${item._idx}`}
                onClick={() => toggleItem(item._docId, item._idx)}
                className={`flex items-start gap-3 w-full text-left p-2.5 rounded-lg transition-colors cursor-pointer ${
                  item.done
                    ? 'bg-green-50 text-green-700'
                    : 'hover:bg-accent text-foreground'
                }`}
              >
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${item.done ? 'line-through opacity-60' : ''}`}>
                    {item.text}
                  </span>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">
                  {item.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
