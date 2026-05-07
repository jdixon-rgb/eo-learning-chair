import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send, FileText } from 'lucide-react'

export default function SendPaymentPackageDialog({ open, onOpenChange, speaker, chapter, events, onSent }) {
  const defaultRecipient = chapter?.executive_director_email || ''
  const primaryEvent = useMemo(() => {
    if (!speaker || !events) return null
    return events.find(e => e.speaker_id === speaker.id)
      || events.find(e => (e.candidate_speaker_ids || []).includes(speaker.id))
      || null
  }, [speaker, events])

  const [recipient, setRecipient] = useState(defaultRecipient)
  const [cc, setCc] = useState('')
  const [note, setNote] = useState('')
  const [eventId, setEventId] = useState(primaryEvent?.id || '')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  // Re-prime when the dialog opens
  useEffect(() => {
    if (open) {
      setRecipient(defaultRecipient)
      setCc('')
      setNote('')
      setEventId(primaryEvent?.id || '')
      setError(null)
    }
  }, [open, defaultRecipient, primaryEvent])

  const hasContract = !!speaker?.contract_storage_path
  const hasW9 = !!speaker?.w9_storage_path
  const canSend = hasContract || hasW9

  const handleSend = async () => {
    setError(null)
    if (!recipient || !recipient.includes('@')) {
      setError('Enter a valid recipient email.')
      return
    }
    if (!speaker?._pipeline_id) {
      setError('No pipeline entry on this speaker — cannot send.')
      return
    }
    setSending(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        setError('Not authenticated. Please refresh and try again.')
        setSending(false)
        return
      }
      const ccEmails = cc.split(',').map(s => s.trim()).filter(s => s.includes('@'))
      const res = await fetch('/api/speakers/send-payment-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pipelineId: speaker._pipeline_id,
          recipientEmail: recipient.trim(),
          ccEmails,
          note,
          eventId: eventId || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || `Failed (${res.status})`)
        setSending(false)
        return
      }
      onSent?.({ sentAt: json.sentAt, sentTo: json.sentTo })
      onOpenChange(false)
    } catch (err) {
      setError(err.message || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  if (!speaker) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" /> Send payment package
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
            <div><span className="text-muted-foreground">Speaker:</span> <span className="font-medium">{speaker.name}</span></div>
            {primaryEvent && <div><span className="text-muted-foreground">Event:</span> {primaryEvent.title || primaryEvent.name}</div>}
            <div className="flex items-center gap-3 pt-1">
              <span className={`flex items-center gap-1 ${hasContract ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                <FileText className="h-3 w-3" /> Contract
              </span>
              <span className={`flex items-center gap-1 ${hasW9 ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                <FileText className="h-3 w-3" /> W-9
              </span>
            </div>
            {!canSend && (
              <p className="text-amber-700 pt-1">Upload a contract or W-9 first — there's nothing to attach yet.</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium">Recipient (Executive Director)</label>
            <Input
              type="email"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="ed@yourchapter.org"
            />
            {!defaultRecipient && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Tip: set a default in Settings → Chapter Configuration so this fills in automatically next time.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium">CC (optional, comma-separated)</label>
            <Input
              value={cc}
              onChange={e => setCc(e.target.value)}
              placeholder="board-treasurer@..., president@..."
            />
          </div>

          {events?.length > 0 && (
            <div>
              <label className="text-xs font-medium">Event (for the email subject + body)</label>
              <select
                value={eventId}
                onChange={e => setEventId(e.target.value)}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background"
              >
                <option value="">— None —</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title || ev.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-medium">Note to ED (optional)</label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Anything you'd like to add — e.g. 'Please process the deposit by Friday.'"
              rows={3}
            />
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-2 py-1.5">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
            <Button onClick={handleSend} disabled={!canSend || sending}>
              {sending ? <><Loader2 className="h-3 w-3 animate-spin" /> Sending</> : <><Send className="h-3 w-3" /> Send</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
