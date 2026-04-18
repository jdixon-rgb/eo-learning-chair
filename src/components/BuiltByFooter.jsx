import { BUILDER } from '@/lib/appBranding'

// Subtle attribution strip that pins to the bottom of authenticated layouts.
// Every entrepreneur who uses this app sees who built it + a path to hire them.
// Intentionally quiet — a line of muted text with a single link.
export default function BuiltByFooter() {
  return (
    <footer className="border-t bg-muted/30 mt-8">
      <div className="px-4 md:px-6 py-3 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
        <span>
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
        </span>
        <a
          href={BUILDER.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          {BUILDER.tagline}
        </a>
      </div>
    </footer>
  )
}
