import { useAuth } from '@/lib/auth'
import { AlertTriangle } from 'lucide-react'

// Persistent banner shown across every layout whenever Mock Data Mode is active.
// The banner is the user's (or demo viewer's) visible guarantee that they are
// NOT looking at real chapter data. It cannot be dismissed.
export default function MockModeBanner() {
  const { isMockMode, isDemoUser, setMockMode, isSuperAdmin } = useAuth()

  if (!isMockMode) return null

  return (
    <div className="sticky top-0 z-50 bg-eo-pink text-white shadow-md">
      <div className="flex items-center justify-center gap-3 px-4 py-2 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          DEMO MODE — you are viewing mock data. Nothing here is real.
        </span>
        {isSuperAdmin && !isDemoUser && (
          <button
            type="button"
            onClick={() => setMockMode(false)}
            className="ml-2 rounded bg-white/20 px-2 py-0.5 text-xs font-medium hover:bg-white/30 transition-colors"
          >
            Exit Demo Mode
          </button>
        )}
      </div>
    </div>
  )
}
