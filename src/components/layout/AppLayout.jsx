import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import FloatingFeedback from '@/components/ui/FloatingFeedback'
import BuiltByFooter from '@/components/BuiltByFooter'
import ReadOnlyBanner from '@/components/ReadOnlyBanner'
import { useStore } from '@/lib/store'
import { Loader2 } from 'lucide-react'

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { loading, dbError, clearDbError } = useStore()

  // Auto-close mobile menu on navigation
  const handleNavigate = () => setMobileMenuOpen(false)

  // Member-portal pages were originally designed for a tighter centered
  // column (max-w-5xl) inside the retired MemberPortalLayout. Now that
  // they render inside AppLayout, constrain only those routes so they
  // don't stretch awkwardly wide on desktop. Chair pages keep full width.
  const isPortalRoute = location.pathname.startsWith('/portal')
  const mainClass = isPortalRoute
    ? 'p-4 md:p-6 max-w-5xl mx-auto w-full'
    : 'p-4 md:p-6'

  return (
    // overflow-x-hidden prevents stray content (wide tables, overshooting
    // controls) from forcing the viewport to scroll horizontally, which
    // would visually shrink the topbar relative to the body on mobile.
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} onNavigate={handleNavigate} />
      <div className="md:ml-64 min-w-0">
        <TopBar onMenuToggle={() => setMobileMenuOpen(true)} />
        <ReadOnlyBanner />
        {dbError && (
          <div className="mx-4 mt-2 md:mx-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            <span>{dbError}</span>
            <button onClick={clearDbError} className="ml-4 font-medium underline hover:no-underline">Dismiss</button>
          </div>
        )}
        <main className={mainClass}>
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
        <BuiltByFooter />
      </div>
      <FloatingFeedback />
    </div>
  )
}
