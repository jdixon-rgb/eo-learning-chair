import { APP_NAME } from '@/lib/appBranding'

// Neutral text wordmark for the app. Replaces the EO-branded logo image
// across sidebars, login, and portal headers. Keeps the brand identity
// lightweight and architectural — no image asset to maintain, scales
// perfectly on any screen.
export default function Wordmark({ className = '', size = 'md' }) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-2xl',
  }
  const [first, ...rest] = APP_NAME.split(' ')
  return (
    <span
      className={`font-semibold tracking-tight ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      <span className="text-primary">{first}</span>
      {rest.length > 0 && <span className="ml-1.5 text-foreground">{rest.join(' ')}</span>}
    </span>
  )
}
