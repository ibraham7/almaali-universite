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
import StudyPlanPage from './pages/supervisor/StudyPlanPage';

function App() {
  return (
    <Routes>
      {/* تسجيل الدخول */}
      <Route
        path="/login"
        element={<LoginPage />}
      />

      {/* الصفحات المحمية */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />

          <Route
            path="/student/registration"
            element={<StudentRegistrationPage />}
          />

          <Route
            path="/supervisor/study-plan"
            element={<StudyPlanPage />}
          />
        </Route>
      </Route>

      {/* أي رابط غير معروف */}
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