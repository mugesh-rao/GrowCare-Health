import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProfileProvider } from './context/ProfileContext'
import DashboardLayout from './components/layout/DashboardLayout'
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
      <ProfileProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
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
          <Route path="/workflow/:id" element={<WorkflowPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ProfileProvider>
    </BrowserRouter>
  )
}
