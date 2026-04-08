import { useEngagementStore } from '@/lib/engagementStore'
import { BookOpen } from 'lucide-react'

const CATEGORY_LABELS = {
  faq: 'FAQ',
  university: 'EO University',
  leadership_path: 'Leadership Path',
  seed_moderator_training: 'Seed Moderator Training',
  moderator_training: 'Moderator Training',
  coaching: 'Coaching',
  next_level: 'Next Level',
  myeo_events: 'MyEO Events',
  international: 'International',
  learning_calendar: 'Learning Calendar',
  forum_journey: 'Forum Journey',
  other: 'Other',
}

export default function ConversationLibraryPage() {
  const { resources } = useEngagementStore()

  const published = resources
    .filter(r => r.status === 'published')
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''))

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-amber-600" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Conversation Library</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Curated resources Navigators can surface to new members during sessions. Editing coming next.
        </p>
      </header>

      {published.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-sm text-gray-500">
          No resources published yet.
        </div>
      ) : (
        <div className="space-y-3">
          {published.map(r => (
            <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {CATEGORY_LABELS[r.category] || r.category}
                    </span>
                    {r.contributor_name && (
                      <span className="text-xs text-gray-400">— {r.contributor_name}</span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{r.title}</h3>
                  {r.summary && (
                    <p className="text-sm text-gray-600 mt-1">{r.summary}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
