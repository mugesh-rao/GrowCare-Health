import { useState } from 'react'
import { CalendarClock, ChevronLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card } from '../../components/atoms'
import PatientChatWorkspace from '../../components/Clinic/PatientChatWorkspace'
import PatientSummarySidebar from '../../components/Clinic/PatientSummarySidebar'
import VisitsPanel from '../../components/Clinic/VisitsPanel'
import useHeaderActions from '../../hooks/useHeaderActions'
import { getClinicPatientById } from '../../lib/clinicData'

export default function PatientDetailPage() {
  const navigate = useNavigate()
  const { patientId } = useParams()
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const patient = getClinicPatientById(patientId)

  useHeaderActions(
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        leftIcon={<ChevronLeft className="h-4 w-4" />}
        onClick={() => navigate('/dashboard/patients')}
      >
        All patients
      </Button>
      <Button variant="secondary" leftIcon={<CalendarClock className="h-4 w-4" />}>
        Schedule follow-up
      </Button>
    </div>,
  )

  if (!patient) {
    return (
      <Card>
        <Card.Body className="space-y-4 py-12 text-center">
          <p className="text-lg font-semibold text-ink">Patient not found</p>
          <Button onClick={() => navigate('/dashboard/patients')}>Back to patients</Button>
        </Card.Body>
      </Card>
    )
  }

  return (
    <div className="flex h-full gap-3 overflow-hidden">
      <VisitsPanel
        patient={patient}
        collapsed={leftCollapsed}
        onToggle={() => setLeftCollapsed((v) => !v)}
      />
      <PatientChatWorkspace patient={patient} />
      <PatientSummarySidebar
        patient={patient}
        collapsed={rightCollapsed}
        onToggle={() => setRightCollapsed((v) => !v)}
      />
    </div>
  )
}
