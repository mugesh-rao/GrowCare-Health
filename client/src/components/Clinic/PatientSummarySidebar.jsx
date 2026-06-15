import { useState } from 'react'
import {
  AlertTriangle,
  Brain,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  HeartPulse,
} from 'lucide-react'
import { Badge } from '../atoms'

const specialtyGlyph = {
  Endocrinology: '🧪',
  Ophthalmology: '👁️',
  Oncology: '🧬',
  Cardiology: '🫀',
}

const metricTone = { success: 'success', warning: 'warning', danger: 'danger' }
const alertTone = { info: 'brand', warning: 'warning', danger: 'danger' }

function Section({ title, Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-canvas"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-brand-600" />
          <span className="text-sm font-semibold text-ink">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted" />
        )}
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  )
}

export default function PatientSummarySidebar({ patient, collapsed, onToggle }) {
  return (
    <div
      className={
        'flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-white transition-all duration-200 ' +
        (collapsed ? 'w-[52px] shrink-0' : 'w-[320px] shrink-0')
      }
    >
      {/* Patient info header */}
      {!collapsed ? (
        <div className="shrink-0 border-b border-line px-5 py-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-night-900 text-xl text-white">
                {specialtyGlyph[patient.specialty] || '🩺'}
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold leading-tight text-ink">
                  {patient.name}
                </h2>
                <p className="text-xs text-muted">
                  {patient.mrn} · {patient.age}y · {patient.gender}
                </p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-canvas hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="success">{patient.specialty}</Badge>
            <Badge tone="neutral">{patient.doctor}</Badge>
          </div>
          {patient.nextAppointment && (
            <p className="mt-2.5 rounded-xl bg-canvas px-3 py-2 text-xs font-medium text-muted">
              Next: {patient.nextAppointment}
            </p>
          )}
        </div>
      ) : (
        <div className="flex shrink-0 justify-center border-b border-line py-[14px]">
          <button
            onClick={onToggle}
            className="grid h-8 w-8 place-items-center rounded-xl text-muted transition hover:bg-canvas hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Collapsed strip */}
      {collapsed && (
        <div className="flex flex-1 flex-col items-center gap-3 pt-5">
          <span className="text-xl">{specialtyGlyph[patient.specialty] || '🩺'}</span>
          <span className="text-[10px] font-semibold text-muted">{patient.mrn}</span>
        </div>
      )}

      {/* Collapsible sections */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto">
          <Section title="Summary" Icon={Brain}>
            <p className="text-sm leading-6 text-muted">{patient.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {patient.tags?.map((tag) => (
                <Badge key={tag} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          </Section>

          <Section title="Signals" Icon={HeartPulse}>
            <div className="space-y-2">
              {patient.metrics.map((m) => (
                <div key={m.label} className="rounded-2xl border border-line bg-canvas px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{m.label}</p>
                  <div className="mt-1.5 flex items-end justify-between gap-2">
                    <p className="text-xl font-bold text-ink">{m.value}</p>
                    <Badge tone={metricTone[m.tone] || 'neutral'}>{m.change}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Active flags" Icon={AlertTriangle} defaultOpen={patient.alerts.some((a) => a.tone === 'danger')}>
            <div className="space-y-2">
              {patient.alerts.map((alert) => (
                <div
                  key={alert.title}
                  className="rounded-2xl border border-line bg-canvas px-4 py-3"
                >
                  <Badge tone={alertTone[alert.tone] || 'neutral'}>{alert.tone}</Badge>
                  <p className="mt-2 text-sm font-medium text-ink">{alert.title}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}
