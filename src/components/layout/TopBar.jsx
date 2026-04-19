import { useLocation, NavLink } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { usePageHeader } from '@/lib/pageHeader'
import { APP_NAME } from '@/lib/appBranding'
import { Menu, Shield, Bell } from 'lucide-react'

// TopBar shows different content per breakpoint:
//   Mobile (<md): chapter name (sidebar is collapsed, this is the only
//     place users see what chapter they're in)
//   Desktop (md+): page title + subtitle from PageHeader context
//     (sidebar already shows the chapter name; this reuses the white
//     space to elevate the current page identity)
// Bell icon on the right gives admins one-click access to the
// notifications composer.
export default function TopBar({ onMenuToggle }) {
  const { chapter } = useStore()
  const { effectiveRole, isSuperAdmin, isImpersonating } = useAuth()
  const { title: pageTitle, subtitle: pageSubtitle } = usePageHeader()
  const location = useLocation()

  const isPlatformSurface =
    isSuperAdmin && !isImpersonating && location.pathname.startsWith('/super-admin')

  const canSeeNotifications = hasPermission(effectiveRole, 'canSendNotifications')

  return (
    <header className="h-14 md:h-16 border-b border-border bg-white flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="md:hidden text-foreground p-1.5 -ml-1 rounded-lg hover:bg-accent transition-colors cursor-pointer shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>
        {/* Mobile: chapter name */}
        {isPlatformSurface ? (
          <span className="md:hidden text-base font-bold tracking-tight truncate">
            <span className="text-primary">Our</span>Chapter OS
          </span>
        ) : (
          <h1 className="md:hidden text-base font-bold tracking-tight truncate">
            {chapter?.name || APP_NAME}
          </h1>
        )}
        {/* Desktop: page title + subtitle from PageHeader context */}
        {pageTitle && (
          <div className="hidden md:flex flex-col min-w-0 leading-tight">
            <h1 className="text-lg font-bold tracking-tight truncate">{pageTitle}</h1>
            {pageSubtitle && (
              <div className="text-xs text-muted-foreground truncate">{pageSubtitle}</div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isPlatformSurface && (
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-widest text-warm bg-warm/10 px-2 py-1 rounded">
            <Shield className="h-3 w-3" />
            SUPER ADMIN
          </div>
        )}
        {canSeeNotifications && !isPlatformSurface && (
          <NavLink
            to="/admin/notifications"
            title="Notifications"
            aria-label="Notifications"
            className={({ isActive }) =>
              `p-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <Bell className="h-5 w-5" />
          </NavLink>
        )}
      </div>
    </header>
  )
}
