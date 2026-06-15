import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, FileText, Plus } from 'lucide-react'
import PatientBadge from './PatientBadge'

export default function VisitsPanel({ patient, collapsed, onToggle }) {
  const [expanded, setExpanded] = useState({})

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div
      className={
        'flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-white transition-all duration-200 ' +
        (collapsed ? 'w-[52px] shrink-0' : 'w-[320px] shrink-0')
      }
    >
      {/* Header */}
      <div
        className={
          'flex shrink-0 items-center border-b border-line px-3 py-[14px] ' +
          (collapsed ? 'justify-center' : 'justify-between')
        }
      >
        {!collapsed && (
          <span className="text-sm font-semibold text-ink">Visits &amp; Sources</span>
        )}
        <button
          onClick={onToggle}
          className="grid h-8 w-8 place-items-center rounded-xl text-muted transition hover:bg-canvas hover:text-ink"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Collapsed strip */}
      {collapsed && (
        <div className="flex flex-1 flex-col items-center gap-3 pt-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-canvas text-muted">
            <Calendar className="h-4 w-4" />
          </span>
          <span className="text-xs font-bold text-muted">{patient.visits.length}</span>
        </div>
      )}

      {/* Expanded content */}
      {!collapsed && (
        <div className="flex-1 space-y-1 overflow-y-auto p-3">

          {/* Past visits */}
          <p className="px-1 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Visits
          </p>
          {patient.visits.map((visit, i) => {
            const key = `visit-${i}`
            const open = expanded[key]
            return (
              <div key={key} className="overflow-hidden rounded-2xl border border-line bg-canvas">
                <button
                  className="flex w-full items-start gap-2.5 px-3 py-3 text-left"
                  onClick={() => toggle(key)}
                >
                  <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink">{visit.title}</p>
                    <p className="mt-0.5 text-[10px] text-muted">{visit.date}</p>
                  </div>
                  <PatientBadge value={visit.badge} />
                </button>
                {open && (
                  <div className="border-t border-line px-3 pb-3 pt-2">
                    <p className="text-xs leading-5 text-muted">{visit.detail}</p>
                  </div>
                )}
              </div>
            )
          })}

          {/* Upcoming appointments */}
          <p className="px-1 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Upcoming
          </p>
          {patient.appointments.map((apt, i) => {
            const key = `apt-${i}`
            const open = expanded[key]
            return (
              <div key={key} className="overflow-hidden rounded-2xl border border-line bg-canvas">
                <button
                  className="flex w-full items-start gap-2.5 px-3 py-3 text-left"
                  onClick={() => toggle(key)}
                >
                  <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink">{apt.title}</p>
                    <p className="mt-0.5 text-[10px] text-muted">{apt.date}</p>
                  </div>
                  <PatientBadge value={apt.badge} />
                </button>
                {open && (
                  <div className="border-t border-line px-3 pb-3 pt-2">
                    <p className="text-xs leading-5 text-muted">{apt.detail}</p>
                  </div>
                )}
              </div>
            )
          })}

          {/* Sources / documents */}
          <p className="px-1 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Sources
          </p>
          <button className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-line px-3 py-2.5 text-xs text-muted transition hover:bg-brand-50 hover:text-brand-700">
            <Plus className="h-3.5 w-3.5" />
            Add files
          </button>
          {patient.documents.map((doc, i) => (
            <div
              key={`doc-${i}`}
              className="flex items-start gap-2.5 rounded-2xl border border-line bg-canvas px-3 py-3"
            >
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">{doc.name}</p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {doc.type} · {doc.uploadedAt}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
