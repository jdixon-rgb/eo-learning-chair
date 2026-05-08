import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth'
import { getChairConfig } from '@/lib/chairRoles'
import { ChapterProvider, useChapter } from '@/lib/chapter'
import { FiscalYearProvider } from '@/lib/fiscalYearContext'
import { StoreProvider } from '@/lib/store'
import { BoardStoreProvider } from '@/lib/boardStore'
import { EngagementStoreProvider } from '@/lib/engagementStore'
import { SAPStoreProvider } from '@/lib/sapStore'
import { ForumStoreProvider } from '@/lib/forumStore'
import { VendorStoreProvider } from '@/lib/vendorStore'
import { ADMIN_ROLES, ADMIN_LAYOUT_ROLES, PORTAL_ROLES, SAP_PORTAL_ROLES, SUPER_ADMIN_ROLES, BOARD_ROLES, ENGAGEMENT_ROLES, SETTINGS_ROLES, PRESIDENT_ROLES, FINANCE_ROLES, REGIONAL_ROLES, SPEAKER_LIBRARY_ROLES } from '@/lib/permissions'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import BetaTermsAckGate from '@/components/BetaTermsAckGate'
import { PageHeaderProvider } from '@/lib/pageHeader'
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
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import AccessNeededPage from '@/pages/AccessNeededPage'
import PrivacyPolicy from '@/pages/PrivacyPolicy'
import TermsOfService from '@/pages/TermsOfService'
import MemberCalendarPage from '@/pages/MemberCalendarPage'
import MemberPortalLayout from '@/components/layout/MemberPortalLayout'
import MemberPortalDashboard from '@/pages/portal/MemberPortalDashboard'
import MemberNotificationsPage from '@/pages/portal/MemberNotificationsPage'
import MemberProfilePage from '@/pages/portal/MemberProfilePage'
import SurveyPage from '@/pages/portal/SurveyPage'
import ReflectionsPage from '@/pages/portal/ReflectionsPage'
import LifelinePage from '@/pages/portal/LifelinePage'
import ForumHomePage from '@/pages/portal/ForumHomePage'
import MemberManagementPage from '@/pages/admin/MemberManagementPage'
import StaffManagementPage from '@/pages/admin/StaffManagementPage'
import SLPManagementPage from '@/pages/admin/SLPManagementPage'
import SurveyResultsPage from '@/pages/admin/SurveyResultsPage'
import NotificationComposePage from '@/pages/admin/NotificationComposePage'
import FeedbackPage from '@/pages/FeedbackPage'
import RecommendationsPage from '@/pages/RecommendationsPage'
import SuperAdminDashboard from '@/pages/super-admin/SuperAdminDashboard'
import ChapterConfigPage from '@/pages/super-admin/ChapterConfigPage'
import AnalyticsPage from '@/pages/super-admin/AnalyticsPage'
import RegionalExpertsPage from '@/pages/super-admin/RegionalExpertsPage'
import BoardDashboardPage from '@/pages/board/BoardDashboardPage'
import ChairReportsPage from '@/pages/board/ChairReportsPage'
import CommunicationsPage from '@/pages/board/CommunicationsPage'
import ForumsPage from '@/pages/board/ForumsPage'
import MemberScorecardsPage from '@/pages/board/MemberScorecardsPage'
import CoordinatorPage from '@/pages/CoordinatorPage'
import EngagementDashboard from '@/pages/engagement/EngagementDashboard'
import NavigatorsPage from '@/pages/engagement/NavigatorsPage'
import MentorsPage from '@/pages/engagement/MentorsPage'
import PairingsPage from '@/pages/engagement/PairingsPage'
import ConversationLibraryPage from '@/pages/engagement/ConversationLibraryPage'
import NavigatorBroadcastsPage from '@/pages/engagement/NavigatorBroadcastsPage'
import SAPPartnersPage from '@/pages/SAPPartnersPage'
import PresidentDashboard from '@/pages/president/PresidentDashboard'
import RegionalLearningDashboard from '@/pages/regional/RegionalLearningDashboard'
import SpeakerLibraryPage from '@/pages/library/SpeakerLibraryPage'
import SpeakerLibraryDetailPage from '@/pages/library/SpeakerLibraryDetailPage'
import FinanceDashboard from '@/pages/finance/FinanceDashboard'
import VendorsPage from '@/pages/portal/VendorsPage'
import MemberSAPInterestPage from '@/pages/portal/MemberSAPInterestPage'
import SAPPortalLayout from '@/components/layout/SAPPortalLayout'
import SAPPortalDashboard from '@/pages/sap-portal/SAPPortalDashboard'
import SAPEventListPage from '@/pages/sap-portal/SAPEventListPage'
import SAPProfilePage from '@/pages/sap-portal/SAPProfilePage'
import SAPResourcesPage from '@/pages/sap-portal/SAPResourcesPage'
import SAPAnnouncementsPage from '@/pages/sap-portal/SAPAnnouncementsPage'
import SAPLeadsPage from '@/pages/sap-portal/SAPLeadsPage'
import SAPReviewsPage from '@/pages/sap-portal/SAPReviewsPage'
import SAPFeedbackPage from '@/pages/sap-portal/SAPFeedbackPage'

// Updates the browser tab title to the active chapter's name.
function DocumentTitle() {
  const { activeChapter } = useChapter()
  useEffect(() => {
    document.title = activeChapter?.name || 'OurChapter OS'
  }, [activeChapter?.name])
  return null
}

// Sends each user to their chair role's home page when they hit "/".
// Learning Chair → DashboardPage at "/"; Engagement Chair → "/engagement"; etc.
function ChairHome() {
  const { effectiveRole } = useAuth()
  if (effectiveRole === 'sap_contact') return <Navigate to="/sap-portal" replace />
  const config = getChairConfig(effectiveRole)
  if (config.homePath && config.homePath !== '/') {
    return <Navigate to={config.homePath} replace />
  }
  return <DashboardPage />
}

function App() {
  return (
    <AuthProvider>
      <ChapterProvider>
        <DocumentTitle />
        <FiscalYearProvider>
        <StoreProvider>
          <BoardStoreProvider>
            <EngagementStoreProvider>
            <SAPStoreProvider>
            <ForumStoreProvider>
            <VendorStoreProvider>
            <BrowserRouter>
              <PageHeaderProvider>
              <BetaTermsAckGate>
              <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/access-needed" element={<AccessNeededPage />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />

              {/* Legacy member calendar redirect */}
              <Route path="/member-calendar" element={<Navigate to="/portal/calendar" replace />} />

              {/* Admin routes (sidebar layout) */}
              <Route element={
                <ProtectedRoute allowedRoles={ADMIN_LAYOUT_ROLES}>
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route path="/" element={<ChairHome />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/speakers" element={<SpeakersPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/:id" element={<EventDetailPage />} />
                <Route path="/partners" element={
                  <ProtectedRoute allowedRoles={ADMIN_ROLES}><SAPPartnersPage /></ProtectedRoute>
                } />
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
                  <ProtectedRoute allowedRoles={SETTINGS_ROLES}><SettingsPage /></ProtectedRoute>
                } />
                {/* Admin sub-pages */}
                <Route path="/admin/members" element={
                  <ProtectedRoute allowedRoles={ADMIN_ROLES}><MemberManagementPage /></ProtectedRoute>
                } />
                <Route path="/admin/staff" element={
                  <ProtectedRoute allowedRoles={ADMIN_ROLES}><StaffManagementPage /></ProtectedRoute>
                } />
                <Route path="/admin/slps" element={
                  <ProtectedRoute allowedRoles={ADMIN_ROLES}><SLPManagementPage /></ProtectedRoute>
                } />
                <Route path="/admin/surveys" element={
                  <ProtectedRoute allowedRoles={['president', 'president_elect', 'president_elect_elect', 'learning_chair', 'learning_chair_elect']}><SurveyResultsPage /></ProtectedRoute>
                } />
                <Route path="/recommendations" element={
                  <ProtectedRoute allowedRoles={['super_admin', 'learning_chair', 'learning_chair_elect']}><RecommendationsPage /></ProtectedRoute>
                } />
                <Route path="/admin/notifications" element={
                  <ProtectedRoute allowedRoles={ADMIN_ROLES}><NotificationComposePage /></ProtectedRoute>
                } />
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="/coordinator" element={
                  <ProtectedRoute allowedRoles={ADMIN_ROLES}><CoordinatorPage /></ProtectedRoute>
                } />

                {/* Engagement Chair routes */}
                <Route path="/engagement" element={
                  <ProtectedRoute allowedRoles={ENGAGEMENT_ROLES}><EngagementDashboard /></ProtectedRoute>
                } />
                <Route path="/engagement/navigators" element={
                  <ProtectedRoute allowedRoles={ENGAGEMENT_ROLES}><NavigatorsPage /></ProtectedRoute>
                } />
                <Route path="/engagement/mentors" element={
                  <ProtectedRoute allowedRoles={ENGAGEMENT_ROLES}><MentorsPage /></ProtectedRoute>
                } />
                <Route path="/engagement/pairings" element={
                  <ProtectedRoute allowedRoles={ENGAGEMENT_ROLES}><PairingsPage /></ProtectedRoute>
                } />
                <Route path="/engagement/library" element={
                  <ProtectedRoute allowedRoles={ENGAGEMENT_ROLES}><ConversationLibraryPage /></ProtectedRoute>
                } />
                <Route path="/engagement/broadcasts" element={
                  <ProtectedRoute allowedRoles={ENGAGEMENT_ROLES}><NavigatorBroadcastsPage /></ProtectedRoute>
                } />

                {/* President routes */}
                <Route path="/president" element={
                  <ProtectedRoute allowedRoles={PRESIDENT_ROLES}><PresidentDashboard /></ProtectedRoute>
                } />

                {/* Finance Chair stub */}
                <Route path="/finance" element={
                  <ProtectedRoute allowedRoles={FINANCE_ROLES}><FinanceDashboard /></ProtectedRoute>
                } />

                {/* Regional Learning Chair Expert routes */}
                <Route path="/regional/learning" element={
                  <ProtectedRoute allowedRoles={[...REGIONAL_ROLES, 'super_admin']}><RegionalLearningDashboard /></ProtectedRoute>
                } />

                {/* Public Speaker Library routes */}
                <Route path="/library/speakers" element={
                  <ProtectedRoute allowedRoles={SPEAKER_LIBRARY_ROLES}><SpeakerLibraryPage /></ProtectedRoute>
                } />
                <Route path="/library/speakers/:id" element={
                  <ProtectedRoute allowedRoles={SPEAKER_LIBRARY_ROLES}><SpeakerLibraryDetailPage /></ProtectedRoute>
                } />

                {/* Board routes */}
                <Route path="/board" element={
                  <ProtectedRoute allowedRoles={BOARD_ROLES}><BoardDashboardPage /></ProtectedRoute>
                } />
                <Route path="/board/reports" element={
                  <ProtectedRoute allowedRoles={BOARD_ROLES}><ChairReportsPage /></ProtectedRoute>
                } />
                <Route path="/board/communications" element={
                  <ProtectedRoute allowedRoles={BOARD_ROLES}><CommunicationsPage /></ProtectedRoute>
                } />
                <Route path="/board/forums" element={
                  <ProtectedRoute allowedRoles={BOARD_ROLES}><ForumsPage /></ProtectedRoute>
                } />
                <Route path="/board/scorecards" element={
                  <ProtectedRoute allowedRoles={BOARD_ROLES}><MemberScorecardsPage /></ProtectedRoute>
                } />
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
                <Route path="/portal/reflections" element={<ReflectionsPage />} />
                <Route path="/portal/forum" element={<ForumHomePage />} />
                <Route path="/portal/lifeline" element={<LifelinePage />} />
                <Route path="/portal/vendors" element={<VendorsPage />} />
                <Route path="/portal/partners" element={<MemberSAPInterestPage />} />
                <Route path="/portal/notifications" element={<MemberNotificationsPage />} />
                <Route path="/portal/profile" element={<MemberProfilePage />} />
                <Route path="/portal/feedback" element={<FeedbackPage />} />
              </Route>

              {/* SAP Partner Portal routes */}
              <Route element={
                <ProtectedRoute allowedRoles={SAP_PORTAL_ROLES}>
                  <SAPPortalLayout />
                </ProtectedRoute>
              }>
                <Route path="/sap-portal" element={<SAPPortalDashboard />} />
                <Route path="/sap-portal/events" element={<SAPEventListPage />} />
                <Route path="/sap-portal/profile" element={<SAPProfilePage />} />
                <Route path="/sap-portal/resources" element={<SAPResourcesPage />} />
                <Route path="/sap-portal/leads" element={<SAPLeadsPage />} />
                <Route path="/sap-portal/reviews" element={<SAPReviewsPage />} />
                <Route path="/sap-portal/feedback" element={<SAPFeedbackPage />} />
                <Route path="/sap-portal/announcements" element={<SAPAnnouncementsPage />} />
              </Route>

              {/* Super Admin routes (sidebar layout) */}
              <Route element={
                <ProtectedRoute allowedRoles={SUPER_ADMIN_ROLES}>
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route path="/super-admin" element={<SuperAdminDashboard />} />
                <Route path="/super-admin/analytics" element={<AnalyticsPage />} />
                <Route path="/super-admin/regional-experts" element={<RegionalExpertsPage />} />
                <Route path="/super-admin/chapters/:id" element={<ChapterConfigPage />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </BetaTermsAckGate>
              </PageHeaderProvider>
            </BrowserRouter>
            </VendorStoreProvider>
            </ForumStoreProvider>
            </SAPStoreProvider>
            </EngagementStoreProvider>
          </BoardStoreProvider>
        </StoreProvider>
        </FiscalYearProvider>
      </ChapterProvider>
    </AuthProvider>
  )
}

export default App
