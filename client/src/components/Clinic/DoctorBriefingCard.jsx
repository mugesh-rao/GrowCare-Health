import { useState } from 'react'
import { CheckCheck, ChevronDown, ChevronUp, Pill, Sparkles, TriangleAlert, X } from 'lucide-react'

const FLAG = {
  red:   { accent: 'bg-red-400',     bg: 'bg-red-50',     badge: 'bg-red-100 text-red-700',         label: 'Needs attention' },
  amber: { accent: 'bg-amber-400',   bg: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-700',     label: 'Review required' },
  green: { accent: 'bg-emerald-400', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', label: 'On track' },
}

const COMPLIANCE_STYLE = {
  compliant:       'bg-emerald-100 text-emerald-700',
  uncertain:       'bg-amber-100 text-amber-700',
  'non-compliant': 'bg-red-100 text-red-700',
}

export default function DoctorBriefingCard({ patient, onDismiss }) {
  const [open, setOpen] = useState(true)
  const brief = patient.briefingCard
  if (!brief) return null

  const f = FLAG[brief.flagLevel] || FLAG.green

  return (
    <div className={`shrink-0 flex overflow-hidden rounded-2xl border border-line shadow-sm`}>
      {/* Coloured left accent strip */}
      <div className={`w-1 shrink-0 ${f.accent}`} />

      {/* Content */}
      <div className={`flex-1 min-w-0 ${f.bg}`}>
        {/* Header row */}
        <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-brand-600" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted">AI Pre-Visit Brief</p>
            <p className="truncate text-sm font-bold text-ink">
              {patient.name}
              <span className="font-normal text-muted"> · {brief.visitDaysAgo}d since last visit</span>
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${f.badge}`}>
            {f.label}
          </span>
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-white/70"
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onDismiss}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-white/70"
            title="Dismiss briefing"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Expandable body */}
        {open && (
          <div className="px-4 pb-4">
            <p className="text-sm leading-6 text-slate-700">{brief.aiSummary}</p>

            {/* Chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${COMPLIANCE_STYLE[brief.medicationCompliance] || 'bg-white text-slate-600'}`}>
                <Pill className="h-3 w-3" />
                Meds: {brief.medicationCompliance}
              </span>
              {brief.labStatus && (
                <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
                  <TriangleAlert className="h-3 w-3 text-amber-500" />
                  {brief.labStatus}
                </span>
              )}
            </div>

            {/* Suggested focus */}
            <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-white/80 px-3.5 py-2.5 shadow-sm">
              <span className="mt-0.5 text-base leading-none">🎯</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Suggested focus</p>
                <p className="mt-0.5 text-[13px] font-medium leading-5 text-ink">{brief.recommendedFocus}</p>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={onDismiss}
              className="mt-3 flex items-center gap-1.5 rounded-xl bg-white/80 px-3.5 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-white hover:shadow"
            >
              <CheckCheck className="h-4 w-4 text-emerald-500" />
              Ready to consult
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
