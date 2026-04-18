import { useLocation } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { APP_NAME } from '@/lib/appBranding'
import { Menu, Shield } from 'lucide-react'

// Minimal TopBar — just identifies which chapter you're in (or "Super
// Admin" at the platform level). Role + FY live in the collapsible
// context block inside the sidebar, so we don't duplicate that here.
// Budget and theme moved into the chair surfaces themselves where
// they're more useful in context.
export default function TopBar({ onMenuToggle }) {
  const { chapter } = useStore()
  const { isSuperAdmin, isImpersonating } = useAuth()
  const location = useLocation()

  const isPlatformSurface =
    isSuperAdmin && !isImpersonating && location.pathname.startsWith('/super-admin')

  return (
    <header className="h-14 md:h-16 border-b border-border bg-white flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="md:hidden text-foreground p-1.5 -ml-1 rounded-lg hover:bg-accent transition-colors cursor-pointer shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>
        {isPlatformSurface ? (
          <span className="text-base font-bold tracking-tight truncate">
            <span className="text-primary">Our</span>Chapter OS
          </span>
        ) : (
          <h1 className="text-base font-bold tracking-tight truncate">
            {chapter?.name || APP_NAME}
          </h1>
        )}
      </div>

      {isPlatformSurface && (
        <div className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-warm bg-warm/10 px-2 py-1 rounded shrink-0">
          <Shield className="h-3 w-3" />
          SUPER ADMIN
        </div>
      )}
    </header>
  )
}
