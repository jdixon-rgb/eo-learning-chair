import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Pencil } from 'lucide-react'
import LibrarySpeakerForm, { librarySpeakerToDb, dbToLibrarySpeaker } from './LibrarySpeakerForm'

export default function EditLibrarySpeakerDialog({ open, onClose, speaker, onSaved }) {
  const [form, setForm] = useState(() => dbToLibrarySpeaker(speaker))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => { setForm(dbToLibrarySpeaker(speaker)) }, [speaker])

  const handleSave = async () => {
    setErr('')
    if (!form.name.trim()) { setErr('Name is required.'); return }
    setSaving(true)
    try {
      const payload = librarySpeakerToDb(form)
      const { data, error } = await supabase
        .from('public_speakers')
        .update(payload)
        .eq('id', speaker.id)
        .select('*')
        .single()
      if (error) throw error
      onSaved?.(data)
    } catch (e) {
      setErr(e.message || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Edit speaker
          </DialogTitle>
        </DialogHeader>
        <LibrarySpeakerForm value={form} onChange={setForm} />
        {err && <p className="text-xs text-destructive mt-2">{err}</p>}
        <p className="text-[11px] text-muted-foreground mt-2">
          Edits are recorded in the speaker's revision history with your name and chapter.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
