import { lazy, Suspense } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import GlobalSuccessToast from './components/GlobalSuccessToast';
import RegistrationCountdown from './components/RegistrationCountdown';
import EnrollmentMessagesPanel from './components/EnrollmentMessagesPanel';
import AdvisorEnrollmentMessagesDock from './components/AdvisorEnrollmentMessagesDock';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const StudentSignupPage = lazy(() => import('./pages/auth/StudentSignupPage'));
const DashboardPage = lazy(() => import('./pages/shared/DashboardPage'));
const SupportTicketsPage = lazy(() => import('./pages/shared/SupportTicketsPage'));
const StudentRegistrationPage = lazy(() => import('./pages/student/StudentRegistrationPage'));
const StudentSchedulePage = lazy(() => import('./pages/student/StudentSchedulePage'));
const StudentAcademicStatusPage = lazy(() => import('./pages/student/StudentAcademicStatusPage'));
const AdvisorRegistrationsPage = lazy(() => import('./pages/advisor/AdvisorRegistrationsPage'));
const AdvisorStudentRegistrationPage = lazy(() => import('./pages/advisor/AdvisorStudentRegistrationPage'));
const StudyPlanPage = lazy(() => import('./pages/supervisor/StudyPlanPage'));
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<StudentSignupPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
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
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADVISOR']} />}>
          <Route element={<DashboardLayout />}>
            <Route
              path="/advisor/registrations"
              element={<AdvisorRegistrationsPage />}
            />
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
              element={<StudyPlanPage />}
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
