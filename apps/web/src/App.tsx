import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import ProtectedRoute from './routes/ProtectedRoute';

import DashboardLayout from './layouts/DashboardLayout';

import LoginPage from './pages/auth/LoginPage';

import DashboardPage from './pages/shared/DashboardPage';

import StudentRegistrationPage from './pages/student/StudentRegistrationPage';
import StudentSchedulePage from './pages/student/StudentSchedulePage';

import AdvisorRegistrationsPage from './pages/advisor/AdvisorRegistrationsPage';

import StudyPlanPage from './pages/supervisor/StudyPlanPage';
import SectionsPage from './pages/supervisor/SectionsPage';
import RegistrationPeriodsPage from './pages/supervisor/RegistrationPeriodsPage';
import StudentsPage from './pages/supervisor/StudentsPage';
import AcademicStructurePage from './pages/supervisor/AcademicStructurePage';
import CoursesPage from './pages/supervisor/CoursesPage';
import UsersPage from './pages/supervisor/UsersPage';
import SettingsPage from './pages/supervisor/SettingsPage';
import GradeScalePage from './pages/supervisor/GradeScalePage';
import ResultsImportPage from './pages/supervisor/ResultsImportPage';

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />

      {/* أي مستخدم مسجل دخول */}
      <Route
        element={<ProtectedRoute />}
      >
        <Route
          element={
            <DashboardLayout />
          }
        >
          <Route
            path="/dashboard"
            element={
              <DashboardPage />
            }
          />
        </Route>
      </Route>

      {/* الطالب */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[
              'STUDENT',
            ]}
          />
        }
      >
        <Route
          element={
            <DashboardLayout />
          }
        >
          <Route
            path="/student/registration"
            element={
              <StudentRegistrationPage />
            }
          />

          <Route
            path="/student/schedule"
            element={
              <StudentSchedulePage />
            }
          />
        </Route>
      </Route>

      {/* المرشد الأكاديمي */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[
              'ADVISOR',
            ]}
          />
        }
      >
        <Route
          element={
            <DashboardLayout />
          }
        >
          <Route
            path="/advisor/registrations"
            element={
              <AdvisorRegistrationsPage />
            }
          />
        </Route>
      </Route>

      {/* المرشد + المسجل + مدير النظام */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[
              'ADVISOR',
              'REGISTRAR',
              'SYSTEM_ADMIN',
            ]}
          />
        }
      >
        <Route
          element={
            <DashboardLayout />
          }
        >
          <Route
            path="/students"
            element={
              <StudentsPage />
            }
          />

          <Route
            path="/supervisor/study-plan"
            element={
              <StudyPlanPage />
            }
          />
        </Route>
      </Route>

      {/* المسجل + مدير النظام */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[
              'REGISTRAR',
              'SYSTEM_ADMIN',
            ]}
          />
        }
      >
        <Route
          element={
            <DashboardLayout />
          }
        >
          <Route
            path="/courses"
            element={
              <CoursesPage />
            }
          />

          <Route
            path="/supervisor/sections"
            element={
              <SectionsPage />
            }
          />

          <Route
            path="/supervisor/registration-periods"
            element={
              <RegistrationPeriodsPage />
            }
          />

          <Route
            path="/academic-structure"
            element={
              <AcademicStructurePage />
            }
          />

          <Route
            path="/results/import"
            element={
              <ResultsImportPage />
            }
          />
        </Route>
      </Route>

      {/* مدير النظام فقط */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={[
              'SYSTEM_ADMIN',
            ]}
          />
        }
      >
        <Route
          element={
            <DashboardLayout />
          }
        >
          <Route
            path="/users"
            element={
              <UsersPage />
            }
          />

          <Route
            path="/settings"
            element={
              <SettingsPage />
            }
          />

          <Route
            path="/grade-scale"
            element={
              <GradeScalePage />
            }
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;
