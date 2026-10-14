import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './utils/PrivateRoute';

import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import FacultyStudentDetail from './pages/FacultyStudentDetail';
import MentorDashboard from './pages/MentorDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute requiredRole="admin">
                <AdminDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/faculty/dashboard"
            element={
              <PrivateRoute requiredRole="faculty">
                <FacultyDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/faculty/student/:studentId"
            element={
              <PrivateRoute requiredRole="faculty">
                <FacultyStudentDetail />
              </PrivateRoute>
            }
          />

          <Route
            path="/mentor/dashboard"
            element={
              <PrivateRoute requiredRole="mentor">
                <MentorDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/student/dashboard"
            element={
              <PrivateRoute requiredRole="student">
                <StudentDashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
