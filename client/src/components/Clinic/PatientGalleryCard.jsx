import { ArrowRight, Calendar, ClipboardList, Stethoscope, TriangleAlert } from 'lucide-react'
import PatientBadge from './PatientBadge'

function avatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const colors = [
    { bg: 'bg-brand-100', text: 'text-brand-700' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { bg: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-rose-100', text: 'text-rose-700' },
    { bg: 'bg-violet-100', text: 'text-violet-700' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  ]
  return colors[Math.abs(hash) % colors.length]
}

function initials(name) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function PatientGalleryCard({ patient, onOpen }) {
  const color = avatarColor(patient.name)
  const appointmentCount = patient.appointments?.length ?? 0
  const flaggedAlerts = patient.betweenVisitAlerts?.filter((a) => a.flagged) ?? []
  const hasBetweenVisitFlags = flaggedAlerts.length > 0
  const hasDangerAlert = patient.alerts?.some((a) => a.tone === 'danger')

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full cursor-pointer flex-col rounded-2xl border border-line bg-white p-6 text-left transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15"
    >
      {/* Top row: avatar + name */}
      <div className="flex items-start gap-4">
        <div className="relative">
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold ${color.bg} ${color.text}`}
          >
            {initials(patient.name)}
          </span>
          {hasDangerAlert && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-red-500 ring-2 ring-white">
              <span className="text-[8px] font-bold text-white">!</span>
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-lg font-bold text-ink">{patient.name}</h3>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {patient.mrn} &middot; {patient.age}y &middot; {patient.gender}
          </p>
        </div>
      </div>

      {/* Between-visit alert banner */}
      {hasBetweenVisitFlags && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <p className="text-xs font-semibold text-amber-800">
            {flaggedAlerts.length} between-visit {flaggedAlerts.length === 1 ? 'alert' : 'alerts'} flagged
          </p>
        </div>
      )}

      {/* Condition summary */}
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
        {patient.condition}
      </p>

      {/* Info chips */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{patient.lastVisit}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <ClipboardList className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>{appointmentCount} appt{appointmentCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Stethoscope className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{patient.specialty}</span>
        </div>
      </div>

      {/* Doctor + badges footer */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <p className="text-xs font-medium text-slate-500">{patient.doctor}</p>
        <div className="flex shrink-0 gap-1.5">
          <PatientBadge value={patient.status} />
          <PatientBadge value={patient.risk} kind="risk" />
        </div>
      </div>
    </button>
  )
}
