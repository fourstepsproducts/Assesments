import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRoute, PublicRoute } from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import StudentDashboard from './pages/StudentDashboard';
import TakeAssessment from './pages/TakeAssessment';

import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAssessments from './pages/admin/AdminAssessments';
import AssessmentForm from './pages/admin/AssessmentForm';
import AdminViewAssessment from './pages/admin/AdminViewAssessment';
import AdminResults from './pages/admin/AdminResults';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />

          {/* Student routes */}
          <Route path="/dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
          <Route path="/assessment/:id" element={<ProtectedRoute><TakeAssessment /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="assessments" element={<AdminAssessments />} />
            <Route path="assessments/create" element={<AssessmentForm />} />
            <Route path="assessments/:id" element={<AdminViewAssessment />} />
            <Route path="assessments/:id/edit" element={<AssessmentForm editMode />} />
            <Route path="results" element={<AdminResults />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
