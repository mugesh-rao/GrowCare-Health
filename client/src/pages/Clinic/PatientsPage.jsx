import { useState } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Input } from '../../components/atoms'
import { PatientGalleryCard } from '../../components/Clinic'
import {
  clinicPatients,
  filterClinicPatients,
  statusOptions,
} from '../../lib/clinicData'

export default function PatientsPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    query: '',
    status: 'All statuses',
  })

  const filteredPatients = filterClinicPatients(clinicPatients, filters)

  const setFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="space-y-6 w-full">

      {/* ── Filter bar ── */}
      <Card className="rounded-2xl">
        <Card.Body className="space-y-5">
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
                onChange={(event) => setFilter('query', event.target.value)}
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
        </Card.Body>
      </Card>

      {/* ── Patient cards grid ── */}
      {filteredPatients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white px-8 py-16 text-center">
          <p className="text-lg font-semibold text-ink">No patients match your filters</p>
          <p className="mt-2 text-sm text-muted">Try adjusting the search or status filter above.</p>
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
