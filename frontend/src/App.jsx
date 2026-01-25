import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import NotFoundPage from '@/pages/NotFoundPage';
import DashboardPage from '@/pages/DashboardPage';


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/login" element={
            <ProtectedRoute>
              <LoginPage />
            </ProtectedRoute>
          } />

          <Route path="/forgot-password" element={
            <ProtectedRoute>
              <ForgotPasswordPage />
            </ProtectedRoute>
          } />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={
            <ProtectedRoute>
              <NotFoundPage />
            </ProtectedRoute>
          }
          />
          
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;