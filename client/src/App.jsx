import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import OnboardingRoute from './routes/OnboardingRoute'
import DashboardLayout from './components/layout/DashboardLayout'
import Login from './pages/auth/Login'
import Onboarding from './pages/Onboarding'
import NewPatientPage from './pages/Clinic/NewPatientPage'
import PatientDetailPage from './pages/Clinic/PatientDetailPage'
import PatientsPage from './pages/Clinic/PatientsPage'
import DashboardHub from './pages/dashboard/DashboardHub'
import WhatsAppHub from './pages/dashboard/WhatsAppHub'
import WorkflowPage from './pages/WorkflowPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/onboarding"
            element={
              <OnboardingRoute>
                <Onboarding />
              </OnboardingRoute>
            }
          />

          {/* Dashboard shell with collapsible sidebar */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHub />} />
            <Route path="whatsapp" element={<WhatsAppHub />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/new" element={<NewPatientPage />} />
            <Route path="patients/:patientId" element={<PatientDetailPage />} />
            <Route path="inbox" element={<Navigate to="/dashboard/whatsapp?tab=inbox" replace />} />
            <Route path="workflows" element={<Navigate to="/dashboard?tab=workflows" replace />} />
            <Route path="bookings" element={<Navigate to="/dashboard?tab=bookings" replace />} />
            <Route path="bulk" element={<Navigate to="/dashboard/whatsapp?tab=broadcasts" replace />} />
            <Route path="products" element={<Navigate to="/dashboard/whatsapp?tab=templates" replace />} />
            <Route path="templates" element={<Navigate to="/dashboard/whatsapp?tab=templates" replace />} />
            <Route path="settings" element={<Navigate to="/dashboard/whatsapp?tab=settings" replace />} />
          </Route>

          {/* Full-screen workflow editor */}
          <Route
            path="/workflow/:id"
            element={
              <ProtectedRoute>
                <WorkflowPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
