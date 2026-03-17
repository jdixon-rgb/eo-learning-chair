import { useState } from 'react'
import { useBoardStore } from '@/lib/boardStore'
import { COMM_AUDIENCES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Mail, Send, Trash2, Clock, CheckCircle2 } from 'lucide-react'

const emptyComm = {
  subject: '',
  body: '',
  audience: 'all_members',
  channel: 'in_app',
  status: 'draft',
}

export default function CommunicationsPage() {
  const { communications, addCommunication, updateCommunication, deleteCommunication } = useBoardStore()
  const [showComposer, setShowComposer] = useState(false)
  const [form, setForm] = useState({ ...emptyComm })

  const sorted = [...communications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const drafts = sorted.filter(c => c.status === 'draft')
  const sent = sorted.filter(c => c.status === 'sent')

  function handleSave(asDraft = true) {
    if (!form.subject.trim()) return
    const comm = { ...form }
    if (!asDraft) {
      comm.status = 'sent'
      comm.sent_at = new Date().toISOString()
    }
    addCommunication(comm)
    setForm({ ...emptyComm })
    setShowComposer(false)
  }

  function handleSend(id) {
    updateCommunication(id, { status: 'sent', sent_at: new Date().toISOString() })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Communications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Send messages to chapter members
          </p>
        </div>
        <Button onClick={() => setShowComposer(!showComposer)}>
          <Plus className="h-4 w-4" />
          New Message
        </Button>
      </div>

      {/* Composer */}
      {showComposer && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-sm">Compose Message</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Audience</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.audience}
                onChange={e => setForm({ ...form, audience: e.target.value })}
              >
                {COMM_AUDIENCES.map(a => (
                  <option key={a.id} value={a.id}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Channel</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.channel}
                onChange={e => setForm({ ...form, channel: e.target.value })}
              >
                <option value="in_app">In-App Only</option>
                <option value="email">Email Only</option>
                <option value="both">In-App + Email</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Subject</label>
            <Input
              className="mt-1"
              value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              placeholder="Message subject"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Body</label>
            <textarea
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[160px]"
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
              placeholder="Write your message..."
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={() => handleSave(true)} disabled={!form.subject.trim()} variant="outline">
              Save Draft
            </Button>
            <Button onClick={() => handleSave(false)} disabled={!form.subject.trim()}>
              <Send className="h-4 w-4" />
              Send Now
            </Button>
            <Button variant="outline" onClick={() => setShowComposer(false)} className="ml-auto">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Drafts ({drafts.length})</h2>
          <div className="space-y-2">
            {drafts.map(comm => {
              const audienceLabel = COMM_AUDIENCES.find(a => a.id === comm.audience)?.label ?? comm.audience
              return (
                <div key={comm.id} className="rounded-xl border bg-card px-5 py-4 shadow-sm flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{comm.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{comm.body}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{audienceLabel}</span>
                      <span className="text-[10px] text-muted-foreground">{comm.channel}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" onClick={() => handleSend(comm.id)}>
                      <Send className="h-3.5 w-3.5" />
                      Send
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => { if (confirm('Delete this draft?')) deleteCommunication(comm.id) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Sent */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Sent ({sent.length})</h2>
        {sent.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No messages sent yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sent.map(comm => {
              const audienceLabel = COMM_AUDIENCES.find(a => a.id === comm.audience)?.label ?? comm.audience
              const sentDate = comm.sent_at ? new Date(comm.sent_at).toLocaleDateString() : ''
              return (
                <div key={comm.id} className="rounded-xl border bg-card px-5 py-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{comm.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{comm.body}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{sentDate}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{audienceLabel}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
