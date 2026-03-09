import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { StoreProvider } from '@/lib/store'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/DashboardPage'
import CalendarPage from '@/pages/CalendarPage'
import SpeakersPage from '@/pages/SpeakersPage'
import EventsPage from '@/pages/EventsPage'
import EventDetailPage from '@/pages/EventDetailPage'
import VenuesPage from '@/pages/VenuesPage'
import BudgetPage from '@/pages/BudgetPage'
import SettingsPage from '@/pages/SettingsPage'
import MemberCalendarPage from '@/pages/MemberCalendarPage'

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/speakers" element={<SpeakersPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/venues" element={<VenuesPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          {/* Member-facing calendar (separate layout, no sidebar) */}
          <Route path="/member-calendar" element={<MemberCalendarPage />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}

export default App
