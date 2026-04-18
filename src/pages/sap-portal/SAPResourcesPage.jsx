import { FileText, ExternalLink, BookOpen, Presentation } from 'lucide-react'

const resources = [
  {
    title: 'EO Arizona Website',
    description: 'Chapter homepage with member resources and event information.',
    url: 'https://www.eonetwork.org/arizona/',
    icon: ExternalLink,
  },
  {
    title: 'Partner Benefits Guide',
    description: 'Overview of SAP tier benefits, event access, and speaking opportunities.',
    icon: BookOpen,
    placeholder: true,
  },
  {
    title: 'Event Presentation Guidelines',
    description: 'Requirements for SAP presentations at chapter events — format, timing, and content expectations.',
    icon: Presentation,
    placeholder: true,
  },
  {
    title: 'Forum Training Information',
    description: 'What forum training involves and why it matters for partner participation.',
    icon: FileText,
    placeholder: true,
  },
]

export default function SAPResourcesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Resources</h1>
        <p className="text-sm text-muted-foreground mt-1">Documents and links from your EO chapter</p>
      </div>

      <div className="space-y-3">
        {resources.map((r, i) => {
          const Icon = r.icon
          const content = (
            <div className="flex items-start gap-4 p-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-indigo-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold">{r.title}</h3>
                <p className="text-xs text-muted-foreground/70 mt-0.5">{r.description}</p>
                {r.placeholder && (
                  <span className="text-[10px] text-muted-foreground/40 mt-1 inline-block">Coming soon</span>
                )}
              </div>
              {r.url && <ExternalLink className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />}
            </div>
          )

          return r.url ? (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              {content}
            </a>
          ) : (
            <div key={i} className="rounded-2xl border border-border bg-muted/30 opacity-60">
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
