import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { ChapterProvider } from '@/lib/chapter'
import { StoreProvider } from '@/lib/store'
import { ADMIN_ROLES, ADMIN_LAYOUT_ROLES, PORTAL_ROLES, SUPER_ADMIN_ROLES } from '@/lib/permissions'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/DashboardPage'
import CalendarPage from '@/pages/CalendarPage'
import SpeakersPage from '@/pages/SpeakersPage'
import EventsPage from '@/pages/EventsPage'
import EventDetailPage from '@/pages/EventDetailPage'
import VenuesPage from '@/pages/VenuesPage'
import BudgetPage from '@/pages/BudgetPage'
import ScenarioPage from '@/pages/ScenarioPage'
import SettingsPage from '@/pages/SettingsPage'
import LoginPage from '@/pages/LoginPage'
import MemberCalendarPage from '@/pages/MemberCalendarPage'
import MemberPortalLayout from '@/components/layout/MemberPortalLayout'
import MemberPortalDashboard from '@/pages/portal/MemberPortalDashboard'
import MemberNotificationsPage from '@/pages/portal/MemberNotificationsPage'
import SurveyPage from '@/pages/portal/SurveyPage'
import MemberManagementPage from '@/pages/admin/MemberManagementPage'
import SurveyResultsPage from '@/pages/admin/SurveyResultsPage'
import NotificationComposePage from '@/pages/admin/NotificationComposePage'
import FeedbackPage from '@/pages/FeedbackPage'
import SuperAdminDashboard from '@/pages/super-admin/SuperAdminDashboard'
import ChapterConfigPage from '@/pages/super-admin/ChapterConfigPage'

function App() {
  return (
    <AuthProvider>
      <ChapterProvider>
        <StoreProvider>
          <BrowserRouter>
            <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Legacy member calendar redirect */}
            <Route path="/member-calendar" element={<Navigate to="/portal/calendar" replace />} />

            {/* Admin routes (sidebar layout) */}
            <Route element={
              <ProtectedRoute allowedRoles={ADMIN_LAYOUT_ROLES}>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/speakers" element={<SpeakersPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/venues" element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}><VenuesPage /></ProtectedRoute>
              } />
              <Route path="/budget" element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}><BudgetPage /></ProtectedRoute>
              } />
              <Route path="/scenarios" element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}><ScenarioPage /></ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}><SettingsPage /></ProtectedRoute>
              } />
              {/* Admin sub-pages */}
              <Route path="/admin/members" element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}><MemberManagementPage /></ProtectedRoute>
              } />
              <Route path="/admin/surveys" element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}><SurveyResultsPage /></ProtectedRoute>
              } />
              <Route path="/admin/notifications" element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}><NotificationComposePage /></ProtectedRoute>
              } />
              <Route path="/feedback" element={<FeedbackPage />} />
            </Route>

            {/* Member Portal routes (dark-themed top nav layout) */}
            <Route element={
              <ProtectedRoute allowedRoles={PORTAL_ROLES}>
                <MemberPortalLayout />
              </ProtectedRoute>
            }>
              <Route path="/portal" element={<MemberPortalDashboard />} />
              <Route path="/portal/calendar" element={<MemberCalendarPage embedded />} />
              <Route path="/portal/survey" element={<SurveyPage />} />
              <Route path="/portal/notifications" element={<MemberNotificationsPage />} />
              <Route path="/portal/feedback" element={<FeedbackPage />} />
            </Route>

            {/* Super Admin routes (sidebar layout) */}
            <Route element={
              <ProtectedRoute allowedRoles={SUPER_ADMIN_ROLES}>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
              <Route path="/super-admin/chapters/:id" element={<ChapterConfigPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </StoreProvider>
      </ChapterProvider>
    </AuthProvider>
  )
}

export default App
