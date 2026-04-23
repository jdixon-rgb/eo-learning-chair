import { Link } from 'react-router-dom'
import { Compass, UserCheck, BookOpen, Send } from 'lucide-react'
import { useEngagementStore } from '@/lib/engagementStore'
import TourTip from '@/components/TourTip'
import PageHeader from '@/lib/pageHeader'

export default function EngagementDashboard() {
  const { navigators, pairings, resources, broadcasts } = useEngagementStore()

  const activeNavigators = navigators.filter(n => n.status === 'active').length
  const activePairings = pairings.filter(p => p.status === 'active').length
  const publishedResources = resources.filter(r => r.status === 'published').length
  const openBroadcasts = broadcasts.filter(b => b.status === 'open').length

  return (
    <div className="space-y-6 max-w-6xl">
      <TourTip />
      <PageHeader
        title="Member Engagement"
        subtitle="Welcome new members. Train Navigators. Build the conversation that helps every member find their version of EO."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/engagement/navigators"
          className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-primary hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <Compass className="h-6 w-6 text-primary" />
            <span className="text-2xl font-bold text-gray-900">{activeNavigators}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Navigators</h3>
          <p className="text-xs text-gray-500 mt-1">Active navigators on the roster</p>
        </Link>

        <Link
          to="/engagement/pairings"
          className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-primary hover:shadow-sm transition-all group"
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
          className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-primary hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <BookOpen className="h-6 w-6 text-amber-600" />
            <span className="text-2xl font-bold text-gray-900">{publishedResources}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Conversation Library</h3>
          <p className="text-xs text-gray-500 mt-1">Published resources Navigators can surface to members</p>
        </Link>

        <Link
          to="/engagement/broadcasts"
          className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-primary hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <Send className="h-6 w-6 text-sky-600" />
            <span className="text-2xl font-bold text-gray-900">{openBroadcasts}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Broadcasts</h3>
          <p className="text-xs text-gray-500 mt-1">One-tap check-ins sent to every active navigator</p>
        </Link>
      </div>
    </div>
  )
}
