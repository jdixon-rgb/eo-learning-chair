import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  // Auto-close mobile menu on navigation
  const handleNavigate = () => setMobileMenuOpen(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} onNavigate={handleNavigate} />
      <div className="md:ml-64">
        <TopBar onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
