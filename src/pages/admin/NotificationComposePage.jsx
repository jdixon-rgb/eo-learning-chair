import { useState } from 'react'
import { useStore } from '@/lib/store'
import { sendNotificationToMembers } from '@/lib/notifications'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Bell, Send, Check, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/lib/pageHeader'

const NOTIFICATION_TYPES = [
  { id: 'announcement', label: 'Announcement', icon: Bell, color: 'text-warm' },
  { id: 'event_update', label: 'Event Update', icon: Calendar, color: 'text-primary' },
]

export default function NotificationComposePage() {
  const { events } = useStore()
  const [type, setType] = useState('announcement')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [eventId, setEventId] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return
    setSending(true)

    await sendNotificationToMembers({
      type,
      title: title.trim(),
      body: body.trim(),
      eventId: eventId || null,
    })

    setSending(false)
    setSent(true)

    // Reset after 3 seconds
    setTimeout(() => {
      setSent(false)
      setTitle('')
      setBody('')
      setEventId('')
    }, 3000)
  }

  const upcomingEvents = events
    .filter(e => e.event_date && new Date(e.event_date + 'T23:59:59') >= new Date())
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Send Notification"
        subtitle={
          <>
            Compose and send a notification to all members
            {!isSupabaseConfigured() && (
              <Badge variant="outline" className="ml-2 text-[10px]">Dev mode — notifications will be simulated</Badge>
            )}
          </>
        }
      />

      {/* Type selector */}
      <div>
        <label className="text-sm font-medium mb-2 block">Type</label>
        <div className="flex gap-2">
          {NOTIFICATION_TYPES.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                  type === t.id
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <Icon className={`h-4 w-4 ${t.color}`} />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Event link (optional) */}
      {type === 'event_update' && upcomingEvents.length > 0 && (
        <div>
          <label className="text-sm font-medium mb-2 block">Related Event (optional)</label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm cursor-pointer"
          >
            <option value="">None</option>
            {upcomingEvents.map(e => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="text-sm font-medium mb-2 block">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., August Kickoff Event Confirmed!"
          maxLength={100}
        />
        <p className="text-[11px] text-muted-foreground mt-1">{title.length}/100</p>
      </div>

      {/* Body */}
      <div>
        <label className="text-sm font-medium mb-2 block">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write the notification message..."
          rows={5}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Preview */}
      {(title || body) && (
        <div>
          <label className="text-sm font-medium mb-2 block text-muted-foreground">Preview</label>
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Bell className="h-4 w-4 text-warm mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">{title || 'Title'}</h4>
                <p className="text-sm text-muted-foreground mt-1">{body || 'Message body'}</p>
                <p className="text-[11px] text-muted-foreground/50 mt-2">Just now</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSend}
          disabled={!title.trim() || !body.trim() || sending || sent}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
            sent
              ? 'bg-green-500 text-white'
              : 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {sent ? (
            <>
              <Check className="h-4 w-4" />
              Sent!
            </>
          ) : sending ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send to All Members
            </>
          )}
        </button>
      </div>
    </div>
  )
}
