import { BarChart3, TrendingUp, Users2, Building2, Wallet, Sparkles } from 'lucide-react'
import PageHeader from '@/lib/pageHeader'

// Super-admin analytics stub. The real page will surface platform-wide
// metrics — chapter adoption, active users per chapter, feature usage,
// NPS aggregates, AI-call volumes, and eventually revenue. For now it's
// a clean "coming soon" card so the nav item isn't a dead link.
const PLANNED_METRICS = [
  { icon: Building2, label: 'Chapter adoption', note: 'Active vs. dormant chapters; new chapters over time.' },
  { icon: Users2, label: 'User engagement', note: 'DAU / MAU per chapter; chair vs. member activity split.' },
  { icon: TrendingUp, label: 'Feature usage', note: 'Which surfaces see the most action across the platform.' },
  { icon: Wallet, label: 'AI cost tracking', note: 'Anthropic + Google Places spend per chapter and per feature.' },
  { icon: Sparkles, label: 'NPS aggregates', note: 'Rolled-up event NPS across all chapters and regions.' },
]

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Analytics"
        subtitle="Platform-wide metrics across every chapter on OurChapter OS."
      />

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-warm/10 text-warm shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Coming soon</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              The analytics surface will land once we have a few more chapters actively using the platform. It'll give you a single place to see adoption, engagement, and cost trends across everyone. For now, here's what's planned.
            </p>
          </div>
        </div>

        <div className="space-y-3 mt-5 pt-5 border-t border-border">
          {PLANNED_METRICS.map(({ icon: Icon, label, note }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
