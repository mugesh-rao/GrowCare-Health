import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Circle,
  MessageSquareText,
  Plus,
  Smartphone,
  Users,
  Workflow,
} from 'lucide-react'
import { Button, Spinner } from '../../components/atoms'
import useRealtime from '../../hooks/useRealtime'
import useHeaderActions from '../../hooks/useHeaderActions'
import userService from '../../services/userService'
import waService from '../../services/waService'

const activityRows = [
  { key: 'messages', label: 'Patient conversations', Icon: MessageSquareText, tint: 'bg-brand-600' },
  { key: 'contacts', label: 'Patient contacts', Icon: Users, tint: 'bg-brand-500' },
  { key: 'workflows', label: 'Live workflows', Icon: Workflow, tint: 'bg-brand-400' },
  { key: 'numbers', label: 'Connected numbers', Icon: Smartphone, tint: 'bg-brand-300' },
]

function CircularRate({ value }) {
  const circumference = 188.5
  const progress = Math.min(Math.max(value, 0), 100) / 100

  return (
    <div className="relative mx-auto mt-3 h-24 w-40 overflow-hidden" aria-label={`${value}% patient response rate`}>
      <svg viewBox="0 0 160 96" className="h-full w-full">
        <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke="#e9e5dd" strokeWidth="13" strokeLinecap="round" />
        <path
          d="M 20 80 A 60 60 0 0 1 140 80"
          fill="none"
          stroke="#176c68"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${circumference * progress} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="text-xs text-muted">Reply rate</p>
        <p className="mt-0.5 text-xl font-semibold text-ink">{value}%</p>
      </div>
    </div>
  )
}

function ActivityGrid({ activity = [] }) {
  const series = activity.length === 7
    ? activity
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => ({ label, received: 0, sent: 0 }))
  const values = series.map((day) => (day.received || 0) + (day.sent || 0))
  const maximum = Math.max(...values, 1)
  const total = values.reduce((sum, value) => sum + value, 0)

  const tone = (value) => {
    if (value === 0) return 'bg-[#f0eee8]'
    const ratio = value / maximum
    if (ratio > 0.72) return 'bg-brand-700'
    if (ratio > 0.42) return 'bg-brand-500'
    return 'bg-brand-200'
  }

  return (
    <div className="mt-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-ink">Last seven days</span>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{total.toLocaleString()} messages</span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {series.map((day, index) => {
          const label = day.label || new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3)
          return (
            <div key={day.date || label} className="space-y-2 text-center">
              <div className={`mx-auto h-9 w-full max-w-10 rounded-md ${tone(values[index])}`} title={`${label}: ${values[index]} messages`} />
              <span className="text-[11px] text-muted">{label}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm">
        <span className="text-muted">Most active day</span>
        <span className="font-semibold text-ink">{Math.max(...values, 0)} messages</span>
      </div>
    </div>
  )
}

export default function Overview() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState([])

  useHeaderActions(
    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/dashboard/patients/new')}>
      Create patient
    </Button>,
  )

  useEffect(() => {
    userService.stats().then(setStats).catch(() => setStats({}))
    waService.list().then(setSessions).catch(() => {})
  }, [])

  useRealtime((event) => {
    if (event.type === 'message') {
      setStats((current) => {
        if (!current) return current
        const direction = event.message.direction === 'in' ? 'received' : 'sent'
        const activity = (current.activity || []).map((day, index, days) => index === days.length - 1
          ? { ...day, [direction]: (day[direction] || 0) + 1 }
          : day)
        return { ...current, [direction]: (current[direction] || 0) + 1, activity }
      })
    }
    if (event.type === 'status') {
      setSessions((current) => current.map((session) => session.id === event.sessionId ? { ...session, status: event.status } : session))
    }
  })

  if (!stats) {
    return <div className="grid place-items-center py-24"><Spinner className="h-8 w-8 text-brand-600" /></div>
  }

  const connectedNumbers = sessions.filter((session) => session.status === 'connected').length
  const totalMessages = (stats.received || 0) + (stats.sent || 0)
  const responseRate = stats.received ? Math.min(100, Math.round(((stats.sent || 0) / stats.received) * 100)) : 0
  const chartValues = {
    messages: totalMessages,
    contacts: stats.contacts || 0,
    workflows: stats.publishedFlows || 0,
    numbers: connectedNumbers,
  }
  const activityMaximum = Math.max(...Object.values(chartValues), 1)
  const onboardingDone = connectedNumbers > 0

  return (
    <section className="rounded-[26px] border border-line bg-surface px-5 py-6 sm:px-9 sm:py-9">
      <div className="mb-8">
        <p className="text-2xl font-semibold tracking-[-0.03em] text-ink">Clinic insights</p>
        <p className="mt-1 text-sm text-muted">A calm, local view of your patient communication and care operations.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_0.95fr_1.7fr]">
        <div className="rounded-xl border border-line bg-canvas p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted"><Activity className="h-4 w-4 text-brand-700" /> Patient response</div>
          <CircularRate value={responseRate} />
        </div>

        <div className="rounded-xl border border-line bg-canvas p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted"><MessageSquareText className="h-4 w-4 text-brand-700" /> Conversation activity</div>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-ink">{totalMessages.toLocaleString()}</p>
          <p className="mt-1 text-sm text-muted">Total local messages</p>
          <div className="mt-4 space-y-2 border-t border-[#d3cec4] pt-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Received</span><span className="font-semibold text-ink">{(stats.received || 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted">Replies sent</span><span className="font-semibold text-ink">{(stats.sent || 0).toLocaleString()}</span></div>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-canvas p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted"><Users className="h-4 w-4 text-brand-700" /> Clinic reach</div>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-ink">{(stats.contacts || 0).toLocaleString()}</p>
          <p className="mt-1 text-sm text-muted">Patient contacts in your local workspace</p>
          <div className="mt-5 flex overflow-hidden rounded-md bg-[#e8e4dc] text-xs font-semibold text-white">
            <div className="flex h-5 items-center gap-1 bg-brand-700 px-2" style={{ width: connectedNumbers ? '82%' : '100%' }}><Smartphone className="h-3.5 w-3.5" /> Connected</div>
            <div className="flex flex-1 items-center justify-center bg-brand-400 px-2">{connectedNumbers} number{connectedNumbers === 1 ? '' : 's'}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-canvas p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-2xl font-semibold tracking-[-0.03em] text-ink">Clinic activity</p>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Local workspace</span>
          </div>
          <div className="mt-7 space-y-4">
            {activityRows.map(({ key, label, Icon, tint }) => {
              const value = chartValues[key]
              const width = value ? Math.max(7, (value / activityMaximum) * 100) : 0
              return (
                <div key={key} className="grid grid-cols-[1.2rem_2.1rem_minmax(0,1fr)_auto] items-center gap-3">
                  <Icon className="h-[18px] w-[18px] text-ink" strokeWidth={1.7} />
                  <span className="rounded px-1.5 py-1 text-center text-xs font-semibold text-brand-800">{value}</span>
                  <div className="h-7 overflow-hidden rounded-sm bg-[#e9e6df]"><div className={`h-full rounded-sm ${tint}`} style={{ width: `${width}%` }} /></div>
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink">{label}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-7 flex items-center justify-between border-t border-line pt-4 text-sm">
            <span className="text-muted">Published automations</span>
            <button className="font-semibold text-brand-700 hover:text-brand-800" onClick={() => navigate('/dashboard/workflows')}>Manage workflows</button>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-canvas p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-2xl font-semibold tracking-[-0.03em] text-ink">Care rhythm</p><p className="mt-1 text-sm text-muted">Communication activity across the week.</p></div>
            <CalendarDays className="h-5 w-5 text-brand-700" />
          </div>
          <ActivityGrid activity={stats.activity || []} />
          <button onClick={() => navigate(onboardingDone ? '/dashboard/whatsapp' : '/dashboard/settings')} className="mt-6 flex w-full items-center gap-2 rounded-lg border border-line bg-white px-3 py-2.5 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50">
            {onboardingDone ? <CheckCircle2 className="h-5 w-5 text-brand-600" /> : <Circle className="h-5 w-5 text-slate-300" />}
            <span className={onboardingDone ? 'text-muted' : 'text-ink'}>{onboardingDone ? 'WhatsApp connection is ready' : 'Connect a clinic WhatsApp number'}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
