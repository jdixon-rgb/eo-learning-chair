import { Link } from 'react-router-dom'
import { Compass, UserCheck, BookOpen } from 'lucide-react'
import { useEngagementStore } from '@/lib/engagementStore'

export default function EngagementDashboard() {
  const { navigators, pairings, resources } = useEngagementStore()

  const activeNavigators = navigators.filter(n => n.status === 'active').length
  const activePairings = pairings.filter(p => p.status === 'active').length
  const publishedResources = resources.filter(r => r.status === 'published').length

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Member Engagement</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome new members. Train Navigators. Build the conversation that helps every member find their version of EO.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/engagement/navigators"
          className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-eo-blue hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <Compass className="h-6 w-6 text-eo-blue" />
            <span className="text-2xl font-bold text-gray-900">{activeNavigators}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Navigators</h3>
          <p className="text-xs text-gray-500 mt-1">Active navigators on the roster</p>
        </Link>

        <Link
          to="/engagement/pairings"
          className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-eo-blue hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <UserCheck className="h-6 w-6 text-emerald-600" />
            <span className="text-2xl font-bold text-gray-900">{activePairings}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Pairings</h3>
          <p className="text-xs text-gray-500 mt-1">Active navigator-to-new-member pairings</p>
        </Link>

        <Link
          to="/engagement/library"
          className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-eo-blue hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <BookOpen className="h-6 w-6 text-amber-600" />
            <span className="text-2xl font-bold text-gray-900">{publishedResources}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Conversation Library</h3>
          <p className="text-xs text-gray-500 mt-1">Published resources Navigators can surface to members</p>
        </Link>
      </div>
    </div>
  )
}
