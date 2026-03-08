import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Settings, Database, Download, Upload } from 'lucide-react'

export default function SettingsPage() {
  const { chapter, updateChapter, events, speakers, venues, budgetItems, contractChecklists } = useStore()

  const handleExport = () => {
    const data = { chapter, events, speakers, venues, budgetItems, contractChecklists, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eo-learning-chair-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Chapter configuration and data management</p>
      </div>

      {/* Chapter Config */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Settings className="h-4 w-4" /> Chapter Configuration
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium">Chapter Name</label>
            <Input
              value={chapter.name}
              onChange={e => updateChapter({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Total Budget ($)</label>
            <Input
              type="number"
              value={chapter.total_budget}
              onChange={e => updateChapter({ total_budget: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-xs font-medium">President's Theme</label>
            <Input
              value={chapter.president_theme || ''}
              onChange={e => updateChapter({ president_theme: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium">President's Name</label>
            <Input
              value={chapter.president_name || ''}
              onChange={e => updateChapter({ president_name: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Database className="h-4 w-4" /> Data Status
        </h3>
        <div className="flex items-center gap-3">
          {isSupabaseConfigured() ? (
            <>
              <Badge variant="success">Connected</Badge>
              <span className="text-sm text-muted-foreground">Supabase database connected</span>
            </>
          ) : (
            <>
              <Badge variant="outline">Local Mode</Badge>
              <span className="text-sm text-muted-foreground">Using in-memory data. Configure Supabase in .env.local for persistence.</span>
            </>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3 pt-2">
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-lg font-bold">{events.length}</p>
            <p className="text-[11px] text-muted-foreground">Events</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-lg font-bold">{speakers.length}</p>
            <p className="text-[11px] text-muted-foreground">Speakers</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-lg font-bold">{venues.length}</p>
            <p className="text-[11px] text-muted-foreground">Venues</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-lg font-bold">{budgetItems.length}</p>
            <p className="text-[11px] text-muted-foreground">Budget Items</p>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Download className="h-4 w-4" /> Data Management
        </h3>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export All Data (JSON)
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Export a complete backup of all your events, speakers, venues, and budget data.</p>
      </div>
    </div>
  )
}
