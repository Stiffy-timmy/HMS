import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { DashboardAdmin } from './pages/DashboardAdmin';
import { DashboardHOD } from './pages/DashboardHOD';
import { DashboardStaff } from './pages/DashboardStaff';
import { Unauthorized, NotFound } from './pages/ErrorPages';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-medicover-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">Validating clinical credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-medicover-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') return <Navigate to="/dashboard/admin" replace />;
  if (user.role === 'hod') return <Navigate to="/dashboard/hod" replace />;
  return <Navigate to="/dashboard/staff" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Role Protected Dashboard Routes */}
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/hod"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod']}>
                <DashboardHOD />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/staff"
            element={
              <ProtectedRoute allowedRoles={['admin', 'hod', 'staff']}>
                <DashboardStaff />
              </ProtectedRoute>
            }
          />

          {/* Root & Error Fallback Routes */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
