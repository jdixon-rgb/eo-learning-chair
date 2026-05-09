import { APP_NAME } from '@/lib/appBranding'
import { isStaging } from '@/lib/env'
import ApertureMark from '@/components/ApertureMark'

// OurChapter OS lockup — Aperture mark + DM Sans wordmark.
// The mark is the brand's anchor; the text is "OurChapter" in ink
// with a softer "OS" tail. On staging the mark flips to orange so
// the env signal is unmistakable across surfaces.
//
// Sizes: sm/md/lg/xl scale both mark and text together. Don't go
// below sm (16px mark) — the notch disappears and the meaning
// disappears with it.

const sizeMap = {
  sm: { mark: 16, text: 'text-sm', gap: 'gap-1.5' },
  md: { mark: 20, text: 'text-base', gap: 'gap-2' },
  lg: { mark: 24, text: 'text-lg', gap: 'gap-2' },
  xl: { mark: 32, text: 'text-2xl', gap: 'gap-2.5' },
}

export default function Wordmark({ className = '', size = 'md' }) {
  const cfg = sizeMap[size] || sizeMap.md
  const [first, ...rest] = APP_NAME.split(' ')
  const markColor = isStaging ? 'text-staging' : 'text-community'

  return (
    <span
      className={`inline-flex items-center ${cfg.gap} font-semibold tracking-tight ${cfg.text} font-display ${className}`}
    >
      <ApertureMark size={cfg.mark} className={markColor} />
      <span className="leading-none">
        <span className="text-foreground">{first}</span>
        {rest.length > 0 && (
          <span className="ml-1 text-muted-foreground font-medium">{rest.join(' ')}</span>
        )}
      </span>
    </span>
  )
}
