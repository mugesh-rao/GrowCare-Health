import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProfileProvider } from './context/ProfileContext'
import DashboardLayout from './components/layout/DashboardLayout'
import Onboarding from './pages/Onboarding'
import NewPatientPage from './pages/Clinic/NewPatientPage'
import PatientDetailPage from './pages/Clinic/PatientDetailPage'
import PatientScribePage from './pages/Clinic/PatientScribePage'
import PatientsPage from './pages/Clinic/PatientsPage'
import DashboardHub from './pages/dashboard/DashboardHub'
import WhatsAppHub from './pages/dashboard/WhatsAppHub'
import WorkflowPage from './pages/WorkflowPage'
import Bookings from './pages/dashboard/Bookings'
import Workflows from './pages/dashboard/Workflows'
import SettingsPage from './pages/dashboard/Settings'

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
            <Route path="patients/:patientId/scribe" element={<PatientScribePage />} />
            <Route path="patients/:patientId" element={<PatientDetailPage />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="workflows" element={<Workflows />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="inbox" element={<Navigate to="/dashboard/whatsapp?tab=inbox" replace />} />
            <Route path="bulk" element={<Navigate to="/dashboard/whatsapp?tab=inbox" replace />} />
            <Route path="products" element={<Navigate to="/dashboard/whatsapp?tab=templates" replace />} />
            <Route path="templates" element={<Navigate to="/dashboard/whatsapp?tab=templates" replace />} />
          </Route>
          <Route path="/workflow/:id" element={<WorkflowPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ProfileProvider>
    </BrowserRouter>
  )
}
