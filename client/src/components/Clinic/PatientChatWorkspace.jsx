import { useState } from 'react'
import {
  Activity,
  ArrowUp,
  CalendarClock,
  MessageSquareMore,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'
import { Badge } from '../atoms'
import PatientBadge from './PatientBadge'

const tabs = [
  { id: 'chat', label: 'Chat', Icon: MessageSquareMore },
  { id: 'visits', label: 'Visit-wise', Icon: CalendarClock },
  { id: 'progression', label: 'Progression', Icon: TrendingUp },
]

const PROMPTS = [
  'Summarize key findings across all reports.',
  'How has this patient changed over time?',
  'What is still missing before the next visit?',
]

const metricTone = { success: 'success', warning: 'warning', danger: 'danger' }

function buildPoints(series) {
  if (!series.length) return ''
  const values = series.map((p) => p.value)
  const min = Math.min(...values)
  const spread = Math.max(Math.max(...values) - min, 1)
  return series
    .map((p, i) => {
      const x = series.length === 1 ? 50 : (i / (series.length - 1)) * 100
      const y = 85 - ((p.value - min) / spread) * 60
      return `${x},${y}`
    })
    .join(' ')
}

export default function PatientChatWorkspace({ patient }) {
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-line bg-white">
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

      {activeTab === 'chat' && <ChatView patient={patient} />}
      {activeTab === 'visits' && <VisitWiseView patient={patient} />}
      {activeTab === 'progression' && <ProgressionView patient={patient} />}
    </div>
  )
}

/* ── Chat ─────────────────────────────────────────────────── */
function ChatView({ patient }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Suggestion chips */}
      <div className="grid shrink-0 grid-cols-3 gap-2 px-5 pt-5">
        {PROMPTS.map((p) => (
          <button
            key={p}
            className="rounded-2xl border border-line bg-canvas px-4 py-3 text-left text-xs text-ink transition hover:border-brand-200 hover:bg-brand-50"
          >
            <Sparkles className="mb-2 h-4 w-4 text-brand-500" />
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {patient.chat.map((msg, i) => {
          const ai = msg.role === 'assistant'
          return (
            <div key={i} className={`flex gap-3 ${ai ? 'justify-start' : 'justify-end'}`}>
              {ai && (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-night-900 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
              )}
              <div
                className={
                  'max-w-[75%] rounded-[20px] px-5 py-3.5 text-sm leading-6 ' +
                  (ai
                    ? 'rounded-tl-md border border-line bg-white text-ink'
                    : 'rounded-tr-md bg-[#e7eafe] text-ink')
                }
              >
                {msg.text}
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-line p-4">
        <div className="flex items-end gap-3 rounded-[20px] border border-line bg-canvas px-4 py-3">
          <textarea
            rows={2}
            className="flex-1 resize-none bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
            placeholder="Ask about progression, missing data, or report interpretation…"
          />
          <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-night-900 text-white transition hover:opacity-80">
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

/* ── Visit-wise ───────────────────────────────────────────── */
function VisitWiseView({ patient }) {
  return (
    <div className="flex-1 space-y-0 overflow-y-auto px-6 py-6">
      {patient.visits.map((visit, i) => (
        <div key={i} className="flex gap-4">
          {/* Timeline spine */}
          <div className="flex flex-col items-center">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-canvas text-brand-600">
              <CalendarClock className="h-4 w-4" />
            </span>
            {i < patient.visits.length - 1 && (
              <span className="my-2 w-px flex-1 bg-line" />
            )}
          </div>

          {/* Card */}
          <div className={`min-w-0 flex-1 ${i < patient.visits.length - 1 ? 'pb-6' : 'pb-2'}`}>
            <div className="mb-1 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{visit.date}</p>
                <h3 className="mt-0.5 font-semibold text-ink">{visit.title}</h3>
              </div>
              <PatientBadge value={visit.badge} />
            </div>
            <p className="text-sm leading-6 text-muted">{visit.detail}</p>

            {/* Report issues shown on the latest visit */}
            {i === 0 && patient.reportIssues?.length > 0 && (
              <div className="mt-4 space-y-2">
                {patient.reportIssues.map((issue, j) => (
                  <div
                    key={j}
                    className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
                  >
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

/* ── Progression ──────────────────────────────────────────── */
function ProgressionView({ patient }) {
  const points = buildPoints(patient.trendSeries)
  const values = patient.trendSeries.map((p) => p.value)
  const min = Math.min(...values)
  const spread = Math.max(Math.max(...values) - min, 1)

  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
      {/* Chart */}
      <div className="rounded-[22px] border border-line bg-[linear-gradient(180deg,#f8fffa_0%,#eef8f0_100%)] p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <Activity className="h-4 w-4 text-brand-600" />
          Longitudinal report trend
        </div>
        <div className="h-52 rounded-[18px] border border-white bg-white p-4">
          <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <line x1="0" y1="85" x2="100" y2="85" stroke="#d7e3db" strokeWidth="1" />
            <polyline
              fill="none"
              stroke="#16a34a"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={points}
            />
            <polygon points={`0,85 ${points} 100,85`} fill="url(#trend-fill)" />
            {patient.trendSeries.map((p, i) => {
              const x = patient.trendSeries.length === 1 ? 50 : (i / (patient.trendSeries.length - 1)) * 100
              const y = 85 - ((p.value - min) / spread) * 60
              return (
                <g key={p.label}>
                  <circle cx={x} cy={y} r="2.6" fill="#14532d" />
                  <text x={x} y="96" textAnchor="middle" fontSize="4" fill="#64746c">
                    {p.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
        <p className="mt-3 text-xs text-muted">
          Demo visualization — clinical metrics can be connected later.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3">
        {patient.metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-line bg-canvas px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{m.label}</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="text-2xl font-bold text-ink">{m.value}</p>
              <Badge tone={metricTone[m.tone] || 'neutral'}>{m.change}</Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Report issues */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Sparkles className="h-4 w-4 text-brand-600" />
          Report issues and context
        </div>
        {patient.reportIssues.map((issue) => (
          <div key={issue.title} className="flex items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <TriangleAlert className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{issue.title}</p>
              <p className="mt-1 text-sm text-muted">{issue.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
