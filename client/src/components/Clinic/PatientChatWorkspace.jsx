import { useState } from 'react'
import {
  ArrowUp,
  CalendarClock,
  FlaskConical,
  MessageSquareMore,
  Pill,
  ScanLine,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'
import DoctorBriefingCard from './DoctorBriefingCard'
import PatientBadge from './PatientBadge'
import { reportCardsByPatient } from '../../lib/clinicReportCards'

const tabs = [
  { id: 'chat',        label: 'Chat',       Icon: MessageSquareMore },
  { id: 'visits',      label: 'Visit-wise', Icon: CalendarClock },
  { id: 'progression', label: 'Progression',Icon: TrendingUp },
]

const PROMPTS = [
  'Summarize key findings across all reports.',
  'How has this patient changed over time?',
  'What is still missing before the next visit?',
]

/* ── Status helpers ──────────────────────────────────────────────── */
const STATUS_STYLE = {
  high:     { pill: 'bg-red-100 text-red-700',         dot: 'text-red-500',     label: 'HIGH' },
  elevated: { pill: 'bg-amber-100 text-amber-700',     dot: 'text-amber-500',   label: 'WATCH' },
  low:      { pill: 'bg-amber-100 text-amber-700',     dot: 'text-amber-500',   label: 'LOW' },
  normal:   { pill: 'bg-emerald-100 text-emerald-700', dot: 'text-emerald-600', label: '✓' },
  neutral:  { pill: 'bg-slate-100 text-slate-600',     dot: 'text-slate-400',   label: '—' },
}
function statusStyle(s) { return STATUS_STYLE[s] || STATUS_STYLE.neutral }

/* ── Imaging SVGs ────────────────────────────────────────────────── */
function ImagingViz({ type }) {
  if (type === 'oct') return (
    <svg viewBox="0 0 88 60" className="h-full w-full" aria-hidden>
      <rect width="88" height="60" fill="#f0f9ff" rx="6" />
      {/* RNFL layers */}
      <polyline points="2,46 10,42 18,38 26,34 34,30 42,32 50,36 58,40 66,38 74,34 82,36 88,38"
                stroke="#93c5fd" strokeWidth="1" fill="none" />
      <polyline points="2,38 10,32 18,26 26,22 34,18 42,20 50,24 58,28 66,26 74,22 82,24 88,26"
                stroke="#3b82f6" strokeWidth="1.8" fill="none" />
      <polyline points="2,28 10,23 18,18 26,14 34,12 42,14 50,18 58,22 66,20 74,16 82,18 88,20"
                stroke="#1d4ed8" strokeWidth="1.2" fill="none" />
      {/* Label */}
      <text x="44" y="56" textAnchor="middle" fontSize="5" fill="#64748b">OCT cross-section</text>
    </svg>
  )
  if (type === 'echo') return (
    <svg viewBox="0 0 88 60" className="h-full w-full" aria-hidden>
      <rect width="88" height="60" fill="#fff0f0" rx="6" />
      {/* Concentric rings (echocardiogram) */}
      <ellipse cx="44" cy="30" rx="36" ry="26" fill="none" stroke="#fca5a5" strokeWidth="1" />
      <ellipse cx="44" cy="30" rx="24" ry="18" fill="none" stroke="#f87171" strokeWidth="1.2" />
      <ellipse cx="44" cy="30" rx="13" ry="10" fill="none" stroke="#ef4444" strokeWidth="1.5" />
      <ellipse cx="44" cy="30" rx="5"  ry="4"  fill="#fca5a5" />
      <text x="44" y="55" textAnchor="middle" fontSize="5" fill="#64748b">Echocardiogram</text>
    </svg>
  )
  if (type === 'ecg') return (
    <svg viewBox="0 0 88 60" className="h-full w-full" aria-hidden>
      <rect width="88" height="60" fill="#f0fdf4" rx="6" />
      {/* Grid lines */}
      {[15,25,35,45].map(y => <line key={y} x1="4" y1={y} x2="84" y2={y} stroke="#bbf7d0" strokeWidth="0.5" />)}
      {/* ECG waveform */}
      <polyline
        points="4,35 14,35 18,35 21,20 24,48 27,35 36,35 40,8 44,54 48,35 57,35 61,25 65,42 69,35 84,35"
        stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
      <text x="44" y="56" textAnchor="middle" fontSize="5" fill="#64748b">12-lead ECG</text>
    </svg>
  )
  if (type === 'mri') return (
    <svg viewBox="0 0 88 60" className="h-full w-full" aria-hidden>
      <rect width="88" height="60" fill="#1e1b4b" rx="6" />
      {/* Brain outline */}
      <ellipse cx="44" cy="28" rx="34" ry="24" fill="#312e81" stroke="#818cf8" strokeWidth="1.5" />
      <ellipse cx="44" cy="28" rx="20" ry="14" fill="#3730a3" stroke="#a5b4fc" strokeWidth="1" />
      {/* Corpus callosum */}
      <path d="M24,28 Q44,20 64,28" stroke="#c7d2fe" strokeWidth="1" fill="none" />
      {/* Fissures */}
      <line x1="44" y1="4" x2="44" y2="52" stroke="#4338ca" strokeWidth="0.8" strokeDasharray="2,2" />
      <text x="44" y="56" textAnchor="middle" fontSize="5" fill="#a5b4fc">MRI Brain</text>
    </svg>
  )
  if (type === 'xray') return (
    <svg viewBox="0 0 88 60" className="h-full w-full" aria-hidden>
      <rect width="88" height="60" fill="#0f172a" rx="6" />
      {/* Lung silhouettes */}
      <ellipse cx="30" cy="30" rx="16" ry="22" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      <ellipse cx="58" cy="30" rx="16" ry="22" fill="#1e293b" stroke="#475569" strokeWidth="1" />
      {/* Rib lines */}
      {[16,21,26,31,36].map((y, i) => (
        <g key={i}>
          <path d={`M22,${y} Q14,${y+2} 12,${y+5}`} stroke="#94a3b8" strokeWidth="0.7" fill="none" />
          <path d={`M66,${y} Q74,${y+2} 76,${y+5}`} stroke="#94a3b8" strokeWidth="0.7" fill="none" />
        </g>
      ))}
      {/* Spine */}
      <rect x="40" y="8" width="8" height="44" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
      <text x="44" y="57" textAnchor="middle" fontSize="5" fill="#94a3b8">Chest X-ray</text>
    </svg>
  )
  if (type === 'skin') return (
    <svg viewBox="0 0 88 60" className="h-full w-full" aria-hidden>
      <rect width="88" height="60" fill="#fffbeb" rx="6" />
      {/* Lesion grid — 6 patches showing affected areas */}
      {[
        { x: 8,  y: 6,  w: 22, h: 18, fill: '#fde68a', stroke: '#f59e0b', opacity: 0.9 },
        { x: 34, y: 6,  w: 22, h: 18, fill: '#fca5a5', stroke: '#ef4444', opacity: 0.85 },
        { x: 60, y: 6,  w: 22, h: 18, fill: '#fdba74', stroke: '#f97316', opacity: 0.7 },
        { x: 8,  y: 30, w: 22, h: 18, fill: '#fca5a5', stroke: '#ef4444', opacity: 0.8 },
        { x: 34, y: 30, w: 22, h: 18, fill: '#fde68a', stroke: '#f59e0b', opacity: 0.6 },
        { x: 60, y: 30, w: 22, h: 18, fill: '#bbf7d0', stroke: '#22c55e', opacity: 0.5 },
      ].map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="4"
              fill={r.fill} stroke={r.stroke} strokeWidth="0.8" opacity={r.opacity} />
      ))}
      <text x="44" y="56" textAnchor="middle" fontSize="5" fill="#92400e">Dermatology photos</text>
    </svg>
  )
  return (
    <svg viewBox="0 0 88 60" className="h-full w-full" aria-hidden>
      <rect width="88" height="60" fill="#f8fafc" rx="6" />
      <rect x="8"  y="10" width="72" height="7"  rx="3" fill="#e2e8f0" />
      <rect x="8"  y="23" width="55" height="5"  rx="2" fill="#e2e8f0" />
      <rect x="8"  y="32" width="65" height="5"  rx="2" fill="#e2e8f0" />
      <rect x="8"  y="41" width="45" height="5"  rx="2" fill="#e2e8f0" />
      <text x="44" y="55" textAnchor="middle" fontSize="5" fill="#94a3b8">Medical report</text>
    </svg>
  )
}

/* ── Report card components ──────────────────────────────────────── */

function LabCard({ card }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-2.5">
        <FlaskConical className="h-3.5 w-3.5 text-brand-600" />
        <p className="text-xs font-semibold text-ink">{card.title}</p>
      </div>
      <div className="divide-y divide-line">
        {card.values.map((v, i) => {
          const s = statusStyle(v.status)
          return (
            <div key={i} className="flex items-center justify-between px-4 py-2">
              <p className="text-xs text-muted">{v.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-ink">{v.value}</p>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${s.pill}`}>
                  {s.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ImagingCard({ card }) {
  const iconMap = { oct: '👁️', echo: '🫀', ecg: '📈', mri: '🧠', xray: '🩻', skin: '🫧' }
  const icon = iconMap[card.imageType] || '📷'

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-2.5">
        <ScanLine className="h-3.5 w-3.5 text-brand-600" />
        <p className="text-xs font-semibold text-ink">{card.title}</p>
        <span className="ml-auto text-base leading-none">{icon}</span>
      </div>
      <div className="flex">
        {/* Visual scan area */}
        <div className="flex h-32 w-32 shrink-0 items-center justify-center border-r border-line bg-slate-50 p-2">
          <ImagingViz type={card.imageType} />
        </div>
        {/* Condition + values */}
        <div className="flex min-w-0 flex-1 flex-col">
          {card.condition && (
            <p className="border-b border-line px-3 py-2 text-[11px] font-medium leading-4 text-muted">
              {card.condition}
            </p>
          )}
          <div className="divide-y divide-line">
            {card.values?.slice(0, 4).map((v, i) => {
              const s = statusStyle(v.status)
              return (
                <div key={i} className="flex items-center justify-between px-3 py-1.5">
                  <p className="text-[11px] text-muted">{v.name}</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-ink">{v.value}</p>
                    <span className={`text-[9px] font-bold ${s.dot}`}>{s.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function PrescriptionCard({ card }) {
  const withWarnings = card.drugs.filter((d) => d.warning)
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-2.5">
        <Pill className="h-3.5 w-3.5 text-brand-600" />
        <p className="text-xs font-semibold text-ink">{card.title}</p>
        {withWarnings.length > 0 && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-amber-700">
            <TriangleAlert className="h-3 w-3" /> {withWarnings.length} flag
          </span>
        )}
      </div>
      <div className="divide-y divide-line">
        {card.drugs.map((d, i) => (
          <div key={i} className={`flex items-start gap-2 px-4 py-2 ${d.warning ? 'bg-amber-50' : ''}`}>
            <span className="mt-0.5 shrink-0 text-[11px]">{d.warning ? '⚠️' : '✅'}</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink">{d.drug}</p>
              <p className="text-[10px] text-muted">{d.dose}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NoteCard({ card }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-2.5">
        <Sparkles className="h-3.5 w-3.5 text-brand-600" />
        <p className="text-xs font-semibold text-ink">{card.title}</p>
      </div>
      <p className="px-4 py-3 text-sm leading-6 text-muted">{card.text}</p>
    </div>
  )
}

function ReportCard({ card }) {
  if (card.type === 'lab')          return <LabCard card={card} />
  if (card.type === 'imaging')      return <ImagingCard card={card} />
  if (card.type === 'prescription') return <PrescriptionCard card={card} />
  if (card.type === 'note')         return <NoteCard card={card} />
  return null
}

/* ── Main component ──────────────────────────────────────────────── */

export default function PatientChatWorkspace({ patient }) {
  const [briefDismissed, setBriefDismissed] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-3 overflow-hidden">
      {!briefDismissed && patient.briefingCard && (
        <DoctorBriefingCard patient={patient} onDismiss={() => setBriefDismissed(true)} />
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-line bg-white">
        {/* Tab bar */}
        <div className="flex shrink-0 items-center gap-1 border-b border-line px-4 py-3">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ' +
                (activeTab === id
                  ? 'bg-night-900 text-white'
                  : 'text-muted hover:bg-canvas hover:text-ink')
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'chat'        && <ChatView patient={patient} />}
        {activeTab === 'visits'      && <VisitWiseView patient={patient} />}
        {activeTab === 'progression' && <ProgressionCanvas patient={patient} />}
      </div>
    </div>
  )
}

/* ── Chat tab ────────────────────────────────────────────────────── */
function ChatView({ patient }) {
  const [messages, setMessages] = useState(patient.chat || [])
  const [input, setInput] = useState('')

  const send = () => {
    if (!input.trim()) return
    setMessages((m) => [
      ...m,
      { role: 'user', text: input.trim() },
      { role: 'assistant', text: 'Reviewing the full record and all attached sources. Please hold on.' },
    ])
    setInput('')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid shrink-0 grid-cols-3 gap-2 px-5 pt-5">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => setInput(p)}
            className="rounded-2xl border border-line bg-canvas px-4 py-3 text-left text-xs text-ink transition hover:border-brand-200 hover:bg-brand-50"
          >
            <Sparkles className="mb-2 h-4 w-4 text-brand-500" />
            {p}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((msg, i) => {
          const ai = msg.role === 'assistant'
          return (
            <div key={i} className={`flex gap-3 ${ai ? 'justify-start' : 'justify-end'}`}>
              {ai && (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-night-900 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
              )}
              <div className={
                'max-w-[75%] rounded-[20px] px-5 py-3.5 text-sm leading-6 ' +
                (ai ? 'rounded-tl-md border border-line bg-white text-ink' : 'rounded-tr-md bg-[#e7eafe] text-ink')
              }>
                {msg.text}
              </div>
            </div>
          )
        })}
      </div>

      <div className="shrink-0 border-t border-line p-4">
        <div className="flex items-end gap-3 rounded-[20px] border border-line bg-canvas px-4 py-3">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            className="flex-1 resize-none bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
            placeholder="Ask about progression, missing data, or report interpretation…"
          />
          <button
            onClick={send}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-night-900 text-white transition hover:opacity-80"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">
          {patient.totalReports} sources · AI may make mistakes
        </p>
      </div>
    </div>
  )
}

/* ── Visit-wise tab ──────────────────────────────────────────────── */
function VisitWiseView({ patient }) {
  return (
    <div className="flex-1 space-y-0 overflow-y-auto px-6 py-6">
      {patient.visits.map((visit, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-canvas text-brand-600">
              <CalendarClock className="h-4 w-4" />
            </span>
            {i < patient.visits.length - 1 && <span className="my-2 w-px flex-1 bg-line" />}
          </div>

          <div className={`min-w-0 flex-1 ${i < patient.visits.length - 1 ? 'pb-6' : 'pb-2'}`}>
            <div className="mb-1 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{visit.date}</p>
                <h3 className="mt-0.5 font-semibold text-ink">{visit.title}</h3>
              </div>
              <PatientBadge value={visit.badge} />
            </div>
            <p className="text-sm leading-6 text-muted">{visit.detail}</p>

            {i === 0 && patient.reportIssues?.length > 0 && (
              <div className="mt-4 space-y-2">
                {patient.reportIssues.map((issue, j) => (
                  <div key={j} className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">{issue.title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-amber-700">{issue.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Progression canvas tab ──────────────────────────────────────── */
function ProgressionCanvas({ patient }) {
  const patientCards = reportCardsByPatient[patient.id] || {}
  const hasAnyCards = Object.values(patientCards).some((arr) => arr.length > 0)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* AI progression signal */}
      {patient.progressionSignal && (
        <div className="px-5 pt-5">
          <div className="flex items-start gap-3 rounded-2xl border border-line bg-canvas px-4 py-3.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            <p className="text-sm leading-6 text-ink">{patient.progressionSignal}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAnyCards && (
        <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
          <ScanLine className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-muted">No reports attached yet</p>
          <p className="mt-1 text-xs text-muted">
            Upload lab reports, imaging, or prescriptions to see the progression canvas.
          </p>
        </div>
      )}

      {/* Visit rows */}
      <div className="px-5 pb-6 pt-4">
        {patient.visits.map((visit, visitIdx) => {
          const cards = patientCards[visitIdx] || []
          return (
            <VisitSection
              key={visitIdx}
              visit={visit}
              cards={cards}
              isLast={visitIdx === patient.visits.length - 1}
            />
          )
        })}
      </div>
    </div>
  )
}

function VisitSection({ visit, cards, isLast }) {
  return (
    <div className="relative">
      {/* Vertical connector line */}
      {!isLast && (
        <div className="absolute left-[9px] top-[26px] h-full w-px bg-line" />
      )}

      <div className="flex gap-4 pb-8">
        {/* Timeline dot */}
        <div className="relative shrink-0">
          <div className="mt-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-brand-500 bg-white">
            <div className="h-2 w-2 rounded-full bg-brand-500" />
          </div>
        </div>

        {/* Section content */}
        <div className="min-w-0 flex-1">
          {/* Visit header */}
          <div className="mb-3 flex items-center gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                {visit.date}
              </p>
              <h3 className="text-sm font-bold text-ink">{visit.title}</h3>
            </div>
            <PatientBadge value={visit.badge} />
          </div>

          {/* Report cards — 2-column responsive grid */}
          {cards.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {cards.map((card, j) => (
                <ReportCard key={j} card={card} />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-3">
              <p className="text-xs text-muted">{visit.detail}</p>
            </div>
          )}

          {/* Visit detail below cards if cards are present */}
          {cards.length > 0 && (
            <p className="mt-2 text-xs leading-5 text-muted">{visit.detail}</p>
          )}
        </div>
      </div>
    </div>
  )
}
