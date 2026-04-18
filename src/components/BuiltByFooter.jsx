import { BUILDER } from '@/lib/appBranding'

// Subtle attribution strip pinned to the bottom of authenticated layouts.
// Keep this factual and quiet — no calls to action, no "hire me" language.
// EO bylaws treat direct solicitation between members as off-limits, so the
// attribution stays descriptive only.
export default function BuiltByFooter() {
  return (
    <footer className="border-t bg-muted/30 mt-8">
      <div className="px-4 md:px-6 py-3 text-xs text-muted-foreground">
        Built by{' '}
        <a
          href={BUILDER.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground hover:text-primary transition-colors"
        >
          {BUILDER.name}
        </a>
        {' · '}
        <span className="text-muted-foreground">{BUILDER.company}</span>
      </div>
    </footer>
  )
}
