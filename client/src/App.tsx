// Main App component
// Handles routing and protected routes

import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from './store/store'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Courses from './pages/Courses'
import Recommendations from './pages/Recommendations'
import TrainingHistory from './pages/TrainingHistory'
import Reports from './pages/Reports'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      
      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="courses" element={<Courses />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="training-history" element={<TrainingHistory />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      
      {/* Redirect old paths */}
      <Route path="/employees" element={<Navigate to="/dashboard/employees" />} />
      <Route path="/courses" element={<Navigate to="/dashboard/courses" />} />
      <Route path="/recommendations" element={<Navigate to="/dashboard/recommendations" />} />
      <Route path="/training-history" element={<Navigate to="/dashboard/training-history" />} />
      <Route path="/reports" element={<Navigate to="/dashboard/reports" />} />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
