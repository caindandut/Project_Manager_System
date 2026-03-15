import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import NotFoundPage from '@/pages/NotFoundPage';
import DashboardPage from '@/pages/DashboardPage';
import MembersPage from '@/pages/MembersPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import AcceptInvitePage from '@/pages/AcceptInvitePage';


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />

          <Route path="/forgot-password" element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          } />

          <Route path="/reset-password/:token" element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          } />

          {/* Trang accept-invite cần luôn truy cập được, kể cả khi đang đăng nhập */}
          <Route path="/accept-invite" element={<AcceptInvitePage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/members"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <MembersPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;