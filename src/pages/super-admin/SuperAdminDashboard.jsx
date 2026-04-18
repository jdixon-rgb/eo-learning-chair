import { Link } from 'react-router-dom'
import { useChapter } from '@/lib/chapter'
import { Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function SuperAdminDashboard() {
  const { allChapters } = useChapter()

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
