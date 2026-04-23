import { BUILDER } from '@/lib/appBranding'

// Subtle attribution strip pinned to the bottom of authenticated layouts.
// Factual and peer-framed. Company name renders as a link when BUILDER.url
// is set, plain text otherwise.
export default function BuiltByFooter() {
  const company = BUILDER.url ? (
    <a
      href={BUILDER.url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-foreground hover:text-primary transition-colors"
    >
      {BUILDER.company}
    </a>
  ) : (
    <span className="font-medium text-foreground">{BUILDER.company}</span>
  )
  return (
    <footer className="border-t bg-muted/30 mt-8">
      <div className="px-4 md:px-6 py-3 text-xs text-muted-foreground">
        {BUILDER.framing}
        {' · '}
        {company}
      </div>
    </footer>
  )
}
