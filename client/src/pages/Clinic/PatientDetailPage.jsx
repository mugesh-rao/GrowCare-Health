import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, ChevronLeft, Mic } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card } from '../../components/atoms'
import PatientChatWorkspace from '../../components/Clinic/PatientChatWorkspace'
import PatientSummarySidebar from '../../components/Clinic/PatientSummarySidebar'
import VisitsPanel from '../../components/Clinic/VisitsPanel'
import useHeaderActions from '../../hooks/useHeaderActions'
import { clinicalApi } from '../../services/clinicalApi'

export default function PatientDetailPage() {
  const navigate = useNavigate()
  const { patientId } = useParams()
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refreshPatient = useCallback(() => clinicalApi.getPatient(patientId)
    .then(setPatient)
    .catch((requestError) => setError(requestError.message)), [patientId])

  useEffect(() => {
    let active = true
    clinicalApi.getPatient(patientId)
      .then((record) => { if (active) setPatient(record) })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [patientId])

  useEffect(() => {
    const updateFromScribe = (event) => {
      if (event.detail?.patientId === patientId) refreshPatient()
    }
    window.addEventListener('growcare:patient-updated', updateFromScribe)
    return () => window.removeEventListener('growcare:patient-updated', updateFromScribe)
  }, [patientId, refreshPatient])

  const startScribe = () => navigate(`/dashboard/patients/${patientId}/scribe`)
  useHeaderActions(
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        leftIcon={<ChevronLeft className="h-4 w-4" />}
        onClick={() => navigate('/dashboard/patients')}
      >
        All patients
      </Button>
      <Button variant="secondary" leftIcon={<CalendarClock className="h-4 w-4" />}>Schedule follow-up</Button>
      <Button leftIcon={<Mic className="h-4 w-4" />} onClick={startScribe}>Start visit</Button>
    </div>,
    [patient],
  )

  if (loading) {
    return <Card><Card.Body className="py-12 text-center text-sm text-muted">Loading the local clinical record…</Card.Body></Card>
  }

  if (!patient || error) {
    return (
      <Card>
        <Card.Body className="space-y-4 py-12 text-center">
          <p className="text-lg font-semibold text-ink">Patient not found</p>
          {error && <p className="text-sm text-muted">{error}</p>}
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
        onUpdated={refreshPatient}
      />
      <PatientChatWorkspace patient={patient} onUpdated={refreshPatient} />
      <PatientSummarySidebar
        patient={patient}
        collapsed={rightCollapsed}
        onToggle={() => setRightCollapsed((v) => !v)}
      />
    </div>
  )
}
