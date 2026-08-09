import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ClipboardPlus,
  Database,
  FileSearch,
  Hospital,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Input } from '../../components/atoms'
import { PatientGalleryCard } from '../../components/Clinic'
import { specialtyOptions, statusOptions } from '../../lib/clinicData'
import { clinicalApi } from '../../services/clinicalApi'

const statIcon = {
  total: Hospital,
  active: Activity,
  flagged: TriangleAlert,
  between_visit: MessageCircle,
}

export default function PatientsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    query: '',
    status: 'All statuses',
    specialty: 'All specialties',
  })
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPatients = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setPatients(await clinicalApi.listPatients())
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const requestTimer = window.setTimeout(() => { void loadPatients() }, 0)
    return () => window.clearTimeout(requestTimer)
  }, [loadPatients])

  const filteredPatients = useMemo(() => {
    const query = filters.query.trim().toLowerCase()
    return patients.filter((patient) => {
      const haystack = `${patient.name} ${patient.mrn} ${patient.condition} ${patient.specialty}`.toLowerCase()
      return (!query || haystack.includes(query)) &&
        (filters.status === 'All statuses' || patient.status === filters.status) &&
        (filters.specialty === 'All specialties' || patient.specialty === filters.specialty)
    })
  }, [filters, patients])

  const clinicSummaryStats = [
    { id: 'total', label: 'Total patients', value: patients.length, detail: 'Stored in this local workspace' },
    { id: 'active', label: 'Active treatment', value: patients.filter((patient) => patient.status === 'Active').length, detail: 'Patients with ongoing care plans' },
    { id: 'flagged', label: 'Flagged records', value: patients.filter((patient) => patient.alerts?.some((alert) => alert.tone === 'danger')).length, detail: 'Need clinician attention' },
    { id: 'between_visit', label: 'Clinical alerts', value: patients.reduce((total, patient) => total + (patient.alerts?.length || 0), 0), detail: 'Results and between-visit review items' },
  ]

  const setFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  const hasActiveFilters = Boolean(filters.query || filters.status !== 'All statuses' || filters.specialty !== 'All specialties')
  const clearFilters = () => setFilters({ query: '', status: 'All statuses', specialty: 'All specialties' })

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {clinicSummaryStats.map((stat) => {
          const Icon = statIcon[stat.id]
          return (
            <div key={stat.id} className="rounded-2xl border border-line bg-white px-5 py-4 transition hover:border-brand-200 hover:shadow-sm">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="mt-2 text-3xl font-bold text-ink">{stat.value}</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">{stat.label}</p>
              <p className="mt-0.5 text-xs text-muted">{stat.detail}</p>
            </div>
          )
        })}
      </div>

      <Card className="rounded-2xl">
        <Card.Body className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50">
                <Users className="h-5 w-5 text-brand-600" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-ink">Patients</h2>
                <p className="text-xs text-muted">{filteredPatients.length} of {patients.length} local records</p>
              </div>
            </div>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/dashboard/patients/new')}>
              Create patient
            </Button>
          </div>

          <div className="grid gap-3 border-t border-line pt-4 lg:grid-cols-[minmax(0,1fr)_12rem_13rem_auto]">
            <Input
              leftIcon={<Search className="h-4 w-4" />}
              value={filters.query}
              onChange={(event) => setFilter('query', event.target.value)}
              placeholder="Search name, MRN, condition, or specialty"
            />
            <label className="relative">
              <span className="sr-only">Filter by status</span>
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <select className="input-base w-full pl-9" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
                {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="relative">
              <span className="sr-only">Filter by specialty</span>
              <Hospital className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <select className="input-base w-full pl-9" value={filters.specialty} onChange={(event) => setFilter('specialty', event.target.value)}>
                {specialtyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            {hasActiveFilters && (
              <Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center rounded-2xl border border-line bg-white px-8 py-16 text-center">
          <RefreshCw className="h-6 w-6 animate-spin text-brand-600" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-muted">Loading local clinical records</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center rounded-2xl border border-amber-200 bg-amber-50 px-8 py-12 text-center">
          <Database className="h-8 w-8 text-amber-700" aria-hidden="true" />
          <p className="mt-3 text-base font-semibold text-ink">Local clinical workspace is temporarily unavailable</p>
          <p className="mt-1 max-w-lg text-sm text-muted">The patient database could not be reached. Try again after the local service finishes starting.</p>
          <Button className="mt-5" variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={loadPatients}>
            Try again
          </Button>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white px-8 py-16 text-center">
          {hasActiveFilters ? <FileSearch className="h-9 w-9 text-brand-600" aria-hidden="true" /> : <ClipboardPlus className="h-9 w-9 text-brand-600" aria-hidden="true" />}
          <p className="mt-4 text-lg font-semibold text-ink">{hasActiveFilters ? 'No matching patient records' : 'No patient records yet'}</p>
          <p className="mt-2 max-w-md text-sm text-muted">
            {hasActiveFilters ? 'Change or clear the filters to view other local records.' : 'Create a patient to start a database-backed clinical timeline.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {hasActiveFilters && <Button variant="secondary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={clearFilters}>Clear filters</Button>}
            {!hasActiveFilters && <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/dashboard/patients/new')}>Create patient</Button>}
          </div>
        </div>
      ) : (
        <div className="grid w-full gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredPatients.map((patient) => (
            <PatientGalleryCard key={patient.id} patient={patient} onOpen={() => navigate(`/dashboard/patients/${patient.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
