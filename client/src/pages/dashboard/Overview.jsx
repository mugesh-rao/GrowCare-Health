import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardPlus,
  FileText,
  MessageSquareText,
  Mic,
  Plus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Workflow,
} from 'lucide-react'
import { Badge, Button, Spinner } from '../../components/atoms'
import clinicDashboardHero from '../../assets/clinic-dashboard-hero.png'
import { useProfile } from '../../context/ProfileContext'
import useHeaderActions from '../../hooks/useHeaderActions'
import useRealtime from '../../hooks/useRealtime'
import bookingService from '../../services/bookingService'
import { clinicalApi } from '../../services/clinicalApi'
import flowService from '../../services/flowService'
import userService from '../../services/userService'
import waService from '../../services/waService'

const formatNumber = (value) => Number(value || 0).toLocaleString()

function sameDay(value, comparison = new Date()) {
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.toDateString() === comparison.toDateString()
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'P'
}

function formatSlot(booking) {
  const date = new Date(booking.slotIso)
  if (Number.isNaN(date.getTime())) return booking.slotLabel || 'Time to be confirmed'
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function MetricCard({ label, value, detail, Icon, tone = 'brand', onClick }) {
  const colours = {
    brand: 'bg-brand-50 text-brand-700',
    ink: 'bg-[#efede7] text-ink',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  }
  const content = (
    <>
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${colours[tone]}`}><Icon className="h-5 w-5" strokeWidth={1.8} /></div>
      <p className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-ink">{value}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{label}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className="rounded-2xl border border-line bg-surface p-5 text-left transition hover:border-brand-300 hover:bg-brand-50/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15">
      {content}
    </button>
  ) : <div className="rounded-2xl border border-line bg-surface p-5">{content}</div>
}

function ActivityChart({ activity = [] }) {
  const values = activity.map((item) => (item.received || 0) + (item.sent || 0))
  const maximum = Math.max(...values, 1)

  return (
    <div className="mt-7">
      <div className="flex h-40 items-end gap-2 sm:gap-3">
        {activity.map((day, index) => {
          const total = values[index]
          const received = day.received || 0
          const height = total ? Math.max(12, (total / maximum) * 100) : 8
          const receivedHeight = total ? Math.max(3, (received / total) * height) : 0
          const label = new Date(day.date).toLocaleDateString(undefined, { weekday: 'narrow' })
          return (
            <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-32 w-full max-w-12 items-end overflow-hidden rounded-t-lg bg-[#efede7]" title={`${total} messages`}>
                <div className="w-full rounded-t-lg bg-brand-300" style={{ height: `${height}%` }}>
                  <div className="w-full rounded-t-lg bg-brand-700" style={{ height: `${receivedHeight}%` }} />
                </div>
              </div>
              <span className="text-[11px] font-medium text-muted">{label}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-brand-700" />Received</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-brand-300" />Replies sent</span>
        <span className="ml-auto font-semibold text-ink">{formatNumber(values.reduce((sum, value) => sum + value, 0))} messages</span>
      </div>
    </div>
  )
}

function EmptyState({ Icon, title, copy, action }) {
  return (
    <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-line bg-canvas px-5 py-7 text-center">
      <div>
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-surface text-brand-700"><Icon className="h-5 w-5" /></span>
        <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted">{copy}</p>
        {action}
      </div>
    </div>
  )
}

/** A data-backed clinic command centre for the local GrowCare workspace. */
export default function Overview() {
  const navigate = useNavigate()
  const { user } = useProfile()
  const [dashboard, setDashboard] = useState(null)

  useHeaderActions(
    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/dashboard/patients/new')}>
      Create patient
    </Button>,
  )

  useEffect(() => {
    let active = true
    const load = async () => {
      const results = await Promise.allSettled([
        userService.stats(),
        waService.list(),
        clinicalApi.listPatients(),
        bookingService.list(),
        flowService.list(),
        userService.getAiSettings(),
      ])
      if (!active) return
      const value = (index, fallback) => results[index].status === 'fulfilled' ? results[index].value : fallback
      setDashboard({
        stats: value(0, {}),
        sessions: value(1, []),
        patients: value(2, []),
        bookings: value(3, []),
        flows: value(4, []),
        ai: value(5, { hasApiKey: false, useForScribing: false }),
      })
    }
    void load()
    return () => { active = false }
  }, [])

  useRealtime((event) => {
    if (event.type === 'message') {
      setDashboard((current) => {
        if (!current) return current
        const field = event.message.direction === 'in' ? 'received' : 'sent'
        const activity = (current.stats.activity || []).map((day, index, days) => index === days.length - 1
          ? { ...day, [field]: (day[field] || 0) + 1 }
          : day)
        return { ...current, stats: { ...current.stats, [field]: (current.stats[field] || 0) + 1, activity } }
      })
    }
    if (event.type === 'status') {
      setDashboard((current) => current && {
        ...current,
        sessions: current.sessions.map((session) => session.id === event.sessionId ? { ...session, status: event.status } : session),
      })
    }
  })

  const model = useMemo(() => {
    if (!dashboard) return null
    const { stats, patients, bookings, flows, sessions, ai } = dashboard
    const connected = sessions.filter((session) => session.status === 'connected').length
    const todayBookings = bookings.filter((booking) => booking.status !== 'cancelled' && sameDay(booking.slotIso))
    const upcoming = bookings
      .filter((booking) => booking.status !== 'cancelled')
      .sort((a, b) => new Date(a.slotIso) - new Date(b.slotIso))
      .slice(0, 4)
    const flagged = patients.filter((patient) => patient.risk === 'High' || patient.alerts?.some((alert) => alert.severity === 'high' || alert.status === 'open') || patient.chart?.alerts?.some((alert) => alert.status === 'open'))
    const patientFocus = (flagged.length ? flagged : [...patients].sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))).slice(0, 4)
    const liveFlows = flows.filter((flow) => flow.status === 'published').length
    const messageTotal = (stats.received || 0) + (stats.sent || 0)
    const replyRate = stats.received ? Math.min(100, Math.round(((stats.sent || 0) / stats.received) * 100)) : 0
    const activity = stats.activity?.length === 7 ? stats.activity : Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      return { date: date.toISOString(), received: 0, sent: 0 }
    })
    return { stats, patients, bookings, flows, sessions, ai, connected, todayBookings, upcoming, patientFocus, flagged, liveFlows, messageTotal, replyRate, activity }
  }, [dashboard])

  if (!model) return <div className="grid place-items-center py-24"><Spinner className="h-8 w-8 text-brand-600" /></div>

  const firstName = user?.name?.split(' ')[0] || 'there'
  const dayPart = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const startScribe = model.patients[0]
    ? () => navigate(`/dashboard/patients/${model.patients[0].id}/scribe`)
    : () => navigate('/dashboard/patients/new')

  return (
    <div className="mx-auto max-w-[1540px] space-y-6 pb-5">
      <section className="relative overflow-hidden rounded-[28px] border border-[#284a48] bg-night-900 text-white">
        <img src={clinicDashboardHero} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-[1.02] object-cover opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-night-900 via-night-900/85 to-night-900/45" />
        <div className="relative z-10 grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] lg:px-10 lg:py-9">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">
              <span className="inline-flex h-2 w-2 rounded-full bg-brand-300" /> Local clinical workspace
              <span className="text-night-700">•</span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <h1 className="mt-5 max-w-xl text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">{dayPart}, {firstName}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c9d5d2]">Your clinic is ready for the day. Review care priorities, appointments, conversations, and the local automations that support your team.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={startScribe} leftIcon={<Mic className="h-4 w-4" />}>Start consultation</Button>
              <Button variant="secondary" onClick={() => navigate('/dashboard/bookings')} leftIcon={<CalendarPlus className="h-4 w-4" />}>Add appointment</Button>
            </div>
          </div>
          <div className="grid content-start gap-3 rounded-2xl border border-white/15 bg-night-900/55 p-4 backdrop-blur-[2px] sm:grid-cols-2">
            <div className="rounded-xl bg-white/[0.06] p-4"><p className="text-xs font-medium text-[#b8c9c6]">Today&apos;s appointments</p><p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{model.todayBookings.length}</p><p className="mt-1 text-xs text-brand-200">{model.upcoming.length ? `Next at ${formatSlot(model.upcoming[0])}` : 'No upcoming bookings'}</p></div>
            <div className="rounded-xl bg-white/[0.06] p-4"><p className="text-xs font-medium text-[#b8c9c6]">Care items to review</p><p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{model.flagged.length}</p><p className="mt-1 text-xs text-brand-200">Patient alerts and high-risk records</p></div>
            <div className="col-span-full flex items-center gap-3 rounded-xl border border-white/10 px-3.5 py-3 text-sm"><ShieldCheck className="h-5 w-5 shrink-0 text-brand-300" /><span className="text-[#e1eae8]">Records are in this local GrowCare workspace.</span></div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard Icon={Users} value={formatNumber(model.patients.length)} label="Patients in care" detail={`${model.flagged.length} need review`} onClick={() => navigate('/dashboard/patients')} />
        <MetricCard Icon={CalendarDays} value={formatNumber(model.todayBookings.length)} label="Appointments today" detail={`${model.upcoming.length} scheduled ahead`} tone="ink" onClick={() => navigate('/dashboard/bookings')} />
        <MetricCard Icon={MessageSquareText} value={formatNumber(model.messageTotal)} label="Patient messages" detail={`${model.replyRate}% reply rate`} tone="brand" onClick={() => navigate('/dashboard/whatsapp')} />
        <MetricCard Icon={Workflow} value={formatNumber(model.liveFlows)} label="Live workflows" detail={`${model.flows.length} total in workspace`} tone={model.liveFlows ? 'brand' : 'amber'} onClick={() => navigate('/dashboard/workflows')} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.8fr)]">
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="eyebrow">Care activity</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-ink">Patient communication rhythm</h2><p className="mt-1 text-sm text-muted">Messages received and replies sent over the last seven days.</p></div>
            <div className="rounded-xl bg-brand-50 px-3 py-2 text-right"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">Reply rate</p><p className="mt-0.5 text-xl font-semibold text-ink">{model.replyRate}%</p></div>
          </div>
          <ActivityChart activity={model.activity} />
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Today&apos;s schedule</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-ink">Next appointments</h2></div><button type="button" onClick={() => navigate('/dashboard/bookings')} className="text-sm font-semibold text-brand-700 hover:text-brand-800">Open calendar</button></div>
          <div className="mt-5 space-y-3">
            {model.upcoming.length ? model.upcoming.map((booking) => <button type="button" key={booking.id} onClick={() => navigate('/dashboard/bookings')} className="flex w-full items-center gap-3 rounded-xl border border-line bg-canvas px-3 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50">
              <span className="grid h-10 w-11 shrink-0 place-items-center rounded-lg bg-surface text-sm font-semibold text-brand-700">{formatSlot(booking)}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{booking.name || booking.phone || 'Patient appointment'}</span><span className="mt-0.5 block truncate text-xs text-muted">{booking.service || 'Consultation'} · {booking.status || 'booked'}</span></span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </button>) : <EmptyState Icon={CalendarDays} title="Your schedule is open" copy="Add an appointment to see today’s clinic schedule here." action={<Button size="sm" className="mt-4" onClick={() => navigate('/dashboard/bookings')}>Add appointment</Button>} />}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.88fr)]">
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Clinical focus</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-ink">Patients to review</h2><p className="mt-1 text-sm text-muted">High-risk or recently updated records from your local chart.</p></div><button type="button" onClick={() => navigate('/dashboard/patients')} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">View patients <ArrowRight className="h-4 w-4" /></button></div>
          <div className="mt-5 divide-y divide-line rounded-xl border border-line">
            {model.patientFocus.length ? model.patientFocus.map((patient) => {
              const openAlerts = patient.alerts?.filter((alert) => alert.status === 'open').length || patient.chart?.alerts?.filter((alert) => alert.status === 'open').length || 0
              const priority = patient.risk === 'High' || openAlerts > 0
              return <button type="button" key={patient.id} onClick={() => navigate(`/dashboard/patients/${patient.id}`)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-brand-50">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ece9e2] text-xs font-bold text-ink">{initials(patient.name)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{patient.name}</span><span className="mt-0.5 block truncate text-xs text-muted">{patient.mrn} · {patient.specialty || 'General Medicine'}</span></span>
                {priority ? <Badge tone="danger"><CircleAlert className="h-3 w-3" /> Review</Badge> : <Badge tone="neutral">{patient.status || 'New'}</Badge>}
                <ChevronRight className="h-4 w-4 text-muted" />
              </button>
            }) : <div className="p-4"><EmptyState Icon={Stethoscope} title="No patient records yet" copy="Create a patient to begin a local clinical workspace." action={<Button size="sm" className="mt-4" onClick={() => navigate('/dashboard/patients/new')}>Create patient</Button>} /></div>}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <p className="eyebrow">Clinic readiness</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-ink">Your local setup</h2><p className="mt-1 text-sm text-muted">Quick checks for the tools your team uses each day.</p>
          <div className="mt-5 space-y-3">
            <button type="button" onClick={() => navigate('/dashboard/whatsapp')} className="flex w-full items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50"><span className={`grid h-9 w-9 place-items-center rounded-lg ${model.connected ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-700'}`}><MessageSquareText className="h-4.5 w-4.5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">WhatsApp</span><span className="block text-xs text-muted">{model.connected ? `${model.connected} connected number${model.connected === 1 ? '' : 's'}` : 'Connect a clinic number'}</span></span>{model.connected ? <CheckCircle2 className="h-5 w-5 text-brand-600" /> : <ChevronRight className="h-4 w-4 text-muted" />}</button>
            <button type="button" onClick={() => navigate('/dashboard/settings')} className="flex w-full items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50"><span className={`grid h-9 w-9 place-items-center rounded-lg ${model.ai.hasApiKey ? 'bg-brand-50 text-brand-700' : 'bg-[#efede7] text-ink'}`}><Sparkles className="h-4.5 w-4.5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">AI assistance</span><span className="block text-xs text-muted">{model.ai.hasApiKey ? (model.ai.useForScribing ? 'Ready for scribe drafts' : 'Ready for workflow actions') : 'Configure a local OpenAI key'}</span></span>{model.ai.hasApiKey ? <CheckCircle2 className="h-5 w-5 text-brand-600" /> : <ChevronRight className="h-4 w-4 text-muted" />}</button>
            <button type="button" onClick={() => navigate('/dashboard/workflows')} className="flex w-full items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50"><span className={`grid h-9 w-9 place-items-center rounded-lg ${model.liveFlows ? 'bg-brand-50 text-brand-700' : 'bg-[#efede7] text-ink'}`}><Workflow className="h-4.5 w-4.5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">Care automations</span><span className="block text-xs text-muted">{model.liveFlows ? `${model.liveFlows} live workflow${model.liveFlows === 1 ? '' : 's'}` : 'Publish a workflow when ready'}</span></span><ChevronRight className="h-4 w-4 text-muted" /></button>
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-xl bg-canvas p-3.5"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" /><p className="text-xs leading-5 text-muted">Clinical data, transcripts, and settings remain in your local GrowCare workspace unless you explicitly use a configured external integration.</p></div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <button type="button" onClick={() => navigate('/dashboard/patients/new')} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand-300 hover:bg-brand-50"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Users className="h-5 w-5" /></span><span><span className="block text-sm font-semibold text-ink">Register patient</span><span className="block text-xs text-muted">Create a new local record</span></span><ChevronRight className="ml-auto h-4 w-4 text-muted" /></button>
        <button type="button" onClick={startScribe} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand-300 hover:bg-brand-50"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Mic className="h-5 w-5" /></span><span><span className="block text-sm font-semibold text-ink">Start scribe</span><span className="block text-xs text-muted">Open a clinician-review draft</span></span><ChevronRight className="ml-auto h-4 w-4 text-muted" /></button>
        <button type="button" onClick={() => navigate('/dashboard/workflows')} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-brand-300 hover:bg-brand-50"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><ClipboardPlus className="h-5 w-5" /></span><span><span className="block text-sm font-semibold text-ink">Build workflow</span><span className="block text-xs text-muted">Create a reusable care journey</span></span><ChevronRight className="ml-auto h-4 w-4 text-muted" /></button>
      </section>
    </div>
  )
}
