import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Input } from '../../components/atoms'
import { PatientGalleryCard } from '../../components/Clinic'
import { specialtyOptions, statusOptions } from '../../lib/clinicData'
import { clinicalApi } from '../../services/clinicalApi'

const statIcon = { total: '🏥', active: '⚡', flagged: '🔴', between_visit: '💬' }

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

  useEffect(() => {
    let active = true
    clinicalApi.listPatients()
      .then((records) => { if (active) setPatients(records) })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

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

  return (
    <div className="space-y-6 w-full">

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {clinicSummaryStats.map((stat) => (
          <div
            key={stat.id}
            className="rounded-2xl border border-line bg-white px-5 py-4 transition hover:border-brand-200 hover:shadow-sm"
          >
            <p className="text-2xl">{statIcon[stat.id]}</p>
            <p className="mt-2 font-display text-3xl font-bold text-ink">{stat.value}</p>
            <p className="mt-0.5 text-sm font-semibold text-ink">{stat.label}</p>
            <p className="mt-0.5 text-xs text-muted">{stat.detail}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <Card className="rounded-2xl">
        <Card.Body className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50">
                <Users className="h-5 w-5 text-brand-600" />
              </span>
              <div>
                <h3 className="font-display text-xl font-bold text-ink">All patients</h3>
                <p className="text-xs text-muted">{filteredPatients.length} records found</p>
              </div>
            </div>
            <div className="flex w-full max-w-xl items-center gap-3">
              <div className="flex-1">
                <Input
                  leftIcon={<Search className="h-4 w-4" />}
                  value={filters.query}
                  onChange={(e) => setFilter('query', e.target.value)}
                  placeholder="Search name, MRN, condition, or specialty"
                />
              </div>
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/dashboard/patients/new')}
              >
                Create patient
              </Button>
            </div>
          </div>

          {/* Status filter pills */}
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => {
              const active = filters.status === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter('status', option)}
                  className={
                    'rounded-full border px-4 py-1.5 text-sm font-medium transition ' +
                    (active
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-line bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700')
                  }
                >
                  {option}
                </button>
              )
            })}
          </div>

          {/* Specialty filter pills */}
          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            {specialtyOptions.map((option) => {
              const active = filters.specialty === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter('specialty', option)}
                  className={
                    'rounded-full border px-4 py-1.5 text-sm font-medium transition ' +
                    (active
                      ? 'border-night-900 bg-night-900 text-white'
                      : 'border-line bg-white text-slate-600 hover:border-slate-400 hover:text-ink')
                  }
                >
                  {option}
                </button>
              )
            })}
          </div>
        </Card.Body>
      </Card>

      {/* ── Patient cards grid ── */}
      {loading ? (
        <div className="rounded-2xl border border-line bg-white px-8 py-16 text-center text-sm text-muted">Loading local clinical records…</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-8 py-8 text-center text-sm text-red-700">Could not load local records: {error}</div>
      ) : filteredPatients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white px-8 py-16 text-center">
          <p className="text-lg font-semibold text-ink">No local patient records yet</p>
          <p className="mt-2 text-sm text-muted">Create a patient to start a database-backed clinical timeline.</p>
        </div>
      ) : (
        <div className="w-full grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredPatients.map((patient) => (
            <PatientGalleryCard
              key={patient.id}
              patient={patient}
              onOpen={() => navigate(`/dashboard/patients/${patient.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
