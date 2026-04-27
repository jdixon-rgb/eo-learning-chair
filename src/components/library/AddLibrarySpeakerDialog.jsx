import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Plus } from 'lucide-react'
import LibrarySpeakerForm, { emptyLibrarySpeaker, librarySpeakerToDb } from './LibrarySpeakerForm'

export default function AddLibrarySpeakerDialog({ open, onClose, onSaved }) {
  const [form, setForm] = useState(emptyLibrarySpeaker)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSave = async () => {
    setErr('')
    if (!form.name.trim()) { setErr('Name is required.'); return }
    setSaving(true)
    try {
      const payload = librarySpeakerToDb(form)
      const { data, error } = await supabase
        .from('public_speakers')
        .insert(payload)
        .select('*')
        .single()
      if (error) throw error
      onSaved?.(data)
      setForm(emptyLibrarySpeaker)
    } catch (e) {
      setErr(e.message || 'Failed to add speaker.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add speaker to library
          </DialogTitle>
        </DialogHeader>
        <LibrarySpeakerForm value={form} onChange={setForm} />
        {err && <p className="text-xs text-destructive mt-2">{err}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
