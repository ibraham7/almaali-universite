import { lazy, Suspense } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import ProtectedRoute from './routes/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import { isAffairsStaff } from './auth/affairsStaff';
import DashboardLayout from './layouts/DashboardLayout';
import GlobalSuccessToast from './components/GlobalSuccessToast';
import RegistrationCountdown from './components/RegistrationCountdown';
import EnrollmentMessagesPanel from './components/EnrollmentMessagesPanel';
import AdvisorEnrollmentMessagesDock from './components/AdvisorEnrollmentMessagesDock';

const LandingPage = lazy(() => import('./pages/landing/LandingPage'));
const AboutPage = lazy(() => import('./pages/site/AboutPage'));
const CollegesPage = lazy(() => import('./pages/site/CollegesPage'));
const CollegeDetailPage = lazy(() => import('./pages/site/CollegesPage').then((m) => ({ default: m.CollegeDetailPage })));
const AdmissionPage = lazy(() => import('./pages/site/AdmissionPage'));
const NewsListPage = lazy(() => import('./pages/site/NewsPages').then((m) => ({ default: m.NewsListPage })));
const NewsDetailPage = lazy(() => import('./pages/site/NewsPages').then((m) => ({ default: m.NewsDetailPage })));
const EventsPage = lazy(() => import('./pages/site/EntriesPages').then((m) => ({ default: () => <m.EntriesListPage section="events" /> })));
const ResearchPage = lazy(() => import('./pages/site/EntriesPages').then((m) => ({ default: () => <m.EntriesListPage section="research" /> })));
const CampusPage = lazy(() => import('./pages/site/EntriesPages').then((m) => ({ default: () => <m.EntriesListPage section="campus" /> })));
const GraduatesPage = lazy(() => import('./pages/site/EntriesPages').then((m) => ({ default: m.GraduatesPage })));
const EntryDetailPage = lazy(() => import('./pages/site/EntriesPages').then((m) => ({ default: m.EntryDetailPage })));
const TestimonialsPage = lazy(() => import('./pages/site/TestimonialsPage'));
const ContactPage = lazy(() => import('./pages/site/ContactPage'));
const SiteAdminPage = lazy(() => import('./pages/site-admin/SiteAdminPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const StudentSignupPage = lazy(() => import('./pages/auth/StudentSignupPage'));
const DashboardPage = lazy(() => import('./pages/shared/DashboardPage'));
const SupportTicketsPage = lazy(() => import('./pages/shared/SupportTicketsPage'));
const StudentRegistrationPage = lazy(() => import('./pages/student/StudentRegistrationPage'));
const StudentSchedulePage = lazy(() => import('./pages/student/StudentSchedulePage'));
const StudentAcademicStatusPage = lazy(() => import('./pages/student/StudentAcademicStatusPage'));
const StudentRequestsPage = lazy(() => import('./pages/student/StudentRequestsPage'));
const DocumentPrintPage = lazy(() => import('./pages/documents/DocumentPrintPage'));
const VerifyDocumentPage = lazy(() => import('./pages/documents/VerifyDocumentPage'));
const AffairsPage = lazy(() => import('./pages/affairs/AffairsPage'));
const AdvisorRegistrationsPage = lazy(() => import('./pages/advisor/AdvisorRegistrationsPage'));
const AdvisorStudentRegistrationPage = lazy(() => import('./pages/advisor/AdvisorStudentRegistrationPage'));
const StudyPlanPage = lazy(() => import('./pages/supervisor/StudyPlanPage'));
const StudyPlanWizardPage = lazy(() => import('./pages/supervisor/StudyPlanWizardPage'));
const StudyPlansListPage = lazy(() => import('./pages/supervisor/StudyPlansListPage'));
const SectionsPage = lazy(() => import('./pages/supervisor/SectionsPage'));
const RegistrationPeriodsPage = lazy(() => import('./pages/supervisor/RegistrationPeriodsPage'));
const StudentsPage = lazy(() => import('./pages/supervisor/StudentsPage'));
const AcademicStructurePage = lazy(() => import('./pages/supervisor/AcademicStructurePage'));
const CoursesPage = lazy(() => import('./pages/supervisor/CoursesPage'));
const UsersPage = lazy(() => import('./pages/supervisor/UsersPage'));
const SettingsPage = lazy(() => import('./pages/supervisor/SettingsPage'));
const GradeScalePage = lazy(() => import('./pages/supervisor/GradeScalePage'));
const ResultsImportPage = lazy(() => import('./pages/supervisor/ResultsImportPage'));
const AuditLogsPage = lazy(() => import('./pages/supervisor/AuditLogsPage'));

function DashboardHome() {
  const { user } = useAuth();
  if (user?.role === 'SITE_EDITOR') return <Navigate to="/site-admin" replace />;
  if (isAffairsStaff(user)) return <Navigate to="/affairs" replace />;
  return <DashboardPage />;
}

function App() {
  const location = useLocation();
  const studentRegistrationOpen =
    location.pathname === '/student/registration';
  const advisorRegistrationsOpen =
    location.pathname === '/advisor/registrations';

  return (
    <>
      <Suspense fallback={<div role="status" aria-live="polite" style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', color: '#60758a' }}>جارٍ تحميل الصفحة...</div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/colleges" element={<CollegesPage />} />
        <Route path="/colleges/:id" element={<CollegeDetailPage />} />
        <Route path="/admission" element={<AdmissionPage />} />
        <Route path="/news" element={<NewsListPage />} />
        <Route path="/news/:id" element={<NewsDetailPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/campus" element={<CampusPage />} />
        <Route path="/graduates" element={<GraduatesPage />} />
        <Route path="/events/:id" element={<EntryDetailPage />} />
        <Route path="/research/:id" element={<EntryDetailPage />} />
        <Route path="/campus/:id" element={<EntryDetailPage />} />
        <Route path="/graduates/:id" element={<EntryDetailPage />} />
        <Route path="/testimonials" element={<TestimonialsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<StudentSignupPage />} />
        <Route path="/verify/:code?" element={<VerifyDocumentPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/documents/:id" element={<DocumentPrintPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/support-tickets" element={<SupportTicketsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
          <Route element={<DashboardLayout />}>
            <Route
              path="/student/registration"
              element={<StudentRegistrationPage />}
            />
            <Route
              path="/student/schedule"
              element={<StudentSchedulePage />}
            />
            <Route
              path="/student/academic-status"
              element={<StudentAcademicStatusPage />}
            />
            <Route
              path="/student/requests"
              element={<StudentRequestsPage />}
            />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['SYSTEM_ADMIN', 'SITE_EDITOR']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/site-admin" element={<SiteAdminPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['REGISTRAR', 'SYSTEM_ADMIN']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/affairs" element={<AffairsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADVISOR']} />}>
          <Route element={<DashboardLayout />}>
            <Route
              path="/advisor/registrations"
              element={<AdvisorRegistrationsPage />}
            />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADVISOR', 'REGISTRAR', 'SYSTEM_ADMIN']} />}>
          <Route element={<DashboardLayout />}>
            <Route
              path="/advisor/student-registration"
              element={<AdvisorStudentRegistrationPage />}
            />
          </Route>
        </Route>

        <Route
          element={
            <ProtectedRoute
              allowedRoles={['ADVISOR', 'REGISTRAR', 'SYSTEM_ADMIN']}
            />
          }
        >
          <Route element={<DashboardLayout />}>
            <Route path="/students" element={<StudentsPage />} />
            <Route
              path="/supervisor/study-plan"
              element={<StudyPlansListPage />}
            />
            <Route
              path="/supervisor/study-plan/manage"
              element={<StudyPlanPage />}
            />
            <Route
              path="/supervisor/study-plan/new"
              element={<StudyPlanWizardPage />}
            />
            <Route
              path="/supervisor/study-plan/:planId/edit"
              element={<StudyPlanWizardPage />}
            />
          </Route>
        </Route>

        <Route
          element={
            <ProtectedRoute allowedRoles={['ADVISOR', 'REGISTRAR', 'SYSTEM_ADMIN']} />
          }
        >
          <Route element={<DashboardLayout />}>
            <Route path="/courses" element={<CoursesPage />} />
            <Route
              path="/supervisor/sections"
              element={<SectionsPage />}
            />
            <Route
              path="/supervisor/registration-periods"
              element={<RegistrationPeriodsPage />}
            />
            <Route
              path="/academic-structure"
              element={<AcademicStructurePage />}
            />
            <Route
              path="/results/import"
              element={<ResultsImportPage />}
            />
            <Route
              path="/audit-logs"
              element={<AuditLogsPage />}
            />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['SYSTEM_ADMIN']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/grade-scale" element={<GradeScalePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>

      <RegistrationCountdown />

      {studentRegistrationOpen && (
        <EnrollmentMessagesPanel
          mode="student"
          floating
        />
      )}

      {advisorRegistrationsOpen && (
        <AdvisorEnrollmentMessagesDock />
      )}

      <GlobalSuccessToast />
    </>
  );
}

export default App;
