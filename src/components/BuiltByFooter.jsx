import { BUILDER } from '@/lib/appBranding'

// Subtle attribution strip pinned to the bottom of authenticated layouts.
// Factual and peer-framed — "built by an EO member for EO members" positions
// this as contribution, not vendor pitch. No CTA, no solicitation.
export default function BuiltByFooter() {
  return (
    <footer className="border-t bg-muted/30 mt-8">
      <div className="px-4 md:px-6 py-3 text-xs text-muted-foreground">
        {BUILDER.framing}
        {' · '}
        <a
          href={BUILDER.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground hover:text-primary transition-colors"
        >
          {BUILDER.company}
        </a>
      </div>
    </footer>
  )
}
