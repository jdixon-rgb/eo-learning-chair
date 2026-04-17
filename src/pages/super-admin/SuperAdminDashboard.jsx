import { Link } from 'react-router-dom'
import { useChapter } from '@/lib/chapter'
import { useAuth } from '@/lib/auth'
import { Building2, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function SuperAdminDashboard() {
  const { allChapters } = useChapter()
  const { isMockMode, setMockMode } = useAuth()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Platform Administration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {allChapters.length} chapter{allChapters.length !== 1 ? 's' : ''} on the platform
          </p>
        </div>
        <Link to="/super-admin/chapters/new">
          <Button>
            <Plus className="h-4 w-4" />
            Create Chapter
          </Button>
        </Link>
      </div>

      {/* Demo Mode toggle — super-admin only */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-eo-pink/10 text-eo-pink shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Demo Mode</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                When enabled, this browser session sees a fully mocked world — regions, chapters,
                members, events, NPS, budgets — instead of real data. Nothing you do while in
                demo mode persists. Scope is per-browser; other users are unaffected.
              </p>
              <Link
                to="/super-admin/demo-users"
                className="inline-block text-xs text-eo-blue hover:underline mt-2"
              >
                Manage demo user accounts →
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMockMode(!isMockMode)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-eo-blue focus:ring-offset-2 ${
              isMockMode ? 'bg-eo-pink' : 'bg-muted'
            }`}
            aria-pressed={isMockMode}
            aria-label="Toggle demo mode"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
                isMockMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allChapters.map((chapter) => (
          <Link
            key={chapter.id}
            to={`/super-admin/chapters/${chapter.id}`}
            className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-eo-blue/10 text-eo-blue shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm group-hover:text-eo-blue transition-colors truncate">
                  {chapter.name}
                </h3>
                {chapter.president_theme && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {chapter.president_theme}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-center p-2 rounded-lg bg-muted">
                <p className="text-sm font-bold">
                  {MONTH_NAMES[chapter.fiscal_year_start] || 'N/A'}
                </p>
                <p className="text-[10px] text-muted-foreground">FY Start</p>
              </div>
            </div>
          </Link>
        ))}

        {allChapters.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No chapters yet. Create one to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
