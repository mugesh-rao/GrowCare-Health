import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  DoorOpen,
  ListChecks,
  MessageCircleMore,
  MoreHorizontal,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  Stethoscope,
  UserCheck,
  UserRoundX,
  UsersRound,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Badge, Button, Card, Input, Modal, Spinner } from '../../components/atoms'
import AppointmentFormModal from '../../components/organisms/AppointmentFormModal'
import useRealtime from '../../hooks/useRealtime'
import bookingService from '../../services/bookingService'

const statusTone = {
  scheduled: 'neutral', waiting: 'warning', in_consultation: 'brand',
  completed: 'success', no_show: 'danger', cancelled: 'danger',
}

const todayKey = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function Stat({ icon: Icon, label, value, detail, tone = 'brand' }) {
  const colors = {
    brand: 'bg-brand-50 text-brand-700', amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700', slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <Card className="min-w-0">
      <Card.Body className="flex items-center gap-4 px-5 py-4">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${colors[tone]}`}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0"><p className="text-2xl font-bold text-ink">{value}</p><p className="text-sm font-semibold text-ink">{label}</p><p className="truncate text-xs text-muted">{detail}</p></div>
      </Card.Body>
    </Card>
  )
}

function QueueRow({ booking, busy, onAction, onQr }) {
  const waiting = booking.queueStatus === 'waiting'
  const active = booking.queueStatus === 'in_consultation'
  return (
    <div className={`grid items-center gap-4 border-b border-line px-5 py-4 last:border-b-0 lg:grid-cols-[78px_minmax(190px,1fr)_170px_170px_auto] ${active ? 'bg-brand-50/70' : 'bg-white'}`}>
      <div className="flex items-center gap-2 lg:block">
        <span className={`grid h-11 w-11 place-items-center rounded-2xl text-sm font-bold ${active ? 'bg-brand-600 text-white' : 'bg-canvas text-ink'}`}>{booking.tokenNumber ? `T${booking.tokenNumber}` : '—'}</span>
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{booking.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{booking.service} · {booking.doctor || 'Any available clinician'}</p>
      </div>
      <div>
        <Badge tone={statusTone[booking.queueStatus] || 'neutral'}>{String(booking.queueStatus || 'scheduled').replace('_', ' ')}</Badge>
        {waiting && <p className="mt-1.5 text-xs text-muted">{booking.peopleAhead || 0} ahead</p>}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted">
        <Clock3 className="h-4 w-4 text-brand-600" />
        {active ? 'With clinician' : waiting ? `${booking.estimatedWaitMinutes || 0} min estimate` : booking.slotLabel}
      </div>
      <div className="flex items-center justify-end gap-2">
        {waiting && <Button size="sm" loading={busy} leftIcon={<DoorOpen className="h-4 w-4" />} onClick={() => onAction(booking.id, 'call')}>Call patient</Button>}
        {active && <Button size="sm" loading={busy} leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => onAction(booking.id, 'complete')}>Complete</Button>}
        {(waiting || active) && <button disabled={busy} title="Mark no-show" onClick={() => onAction(booking.id, 'no_show')} className="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted hover:bg-red-50 hover:text-red-600"><UserRoundX className="h-4 w-4" /></button>}
        <button title="Show patient QR check-in" onClick={() => onQr(booking)} className="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted hover:bg-brand-50 hover:text-brand-700"><QrCode className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

export default function Bookings() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState('')
  const [notice, setNotice] = useState('')
  const [qrBooking, setQrBooking] = useState(null)

  const load = useCallback(() => bookingService.queue(selectedDate).then(setData), [selectedDate])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true)
      void load().catch((error) => setNotice(error.message)).finally(() => setLoading(false))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])
  useRealtime((event) => { if (event.type === 'booking') load() })

  const action = async (id, name, priority) => {
    setBusyId(id)
    setNotice('')
    try {
      if (name === 'check_in') await bookingService.checkIn(id, priority)
      else await bookingService.queueAction(id, name)
      await load()
    } catch (error) { setNotice(error.message) } finally { setBusyId('') }
  }

  const filteredAppointments = useMemo(() => (data?.appointments || []).filter((item) => {
    const term = search.trim().toLowerCase()
    return !term || [item.name, item.phone, item.service, item.doctor].some((value) => String(value || '').toLowerCase().includes(term))
  }), [data, search])

  const qrValue = qrBooking
    ? `http://${window.location.hostname || '127.0.0.1'}:2238/api/bookings/public/check-in/${qrBooking.checkInCode}`
    : ''

  if (loading && !data) return <div className="grid place-items-center py-24"><Spinner className="h-8 w-8 text-brand-600" /></div>

  const stats = data?.stats || {}
  return (
    <div className="space-y-6 pb-8">
      <section className="overflow-hidden rounded-[26px] bg-night-900 text-white">
        <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">Clinic operations</p><h1 className="mt-2 text-2xl font-bold">Live queue and smart arrival</h1><p className="mt-1 max-w-2xl text-sm text-white/65">Keep reception, clinicians, and patients aligned with live tokens, practical wait estimates, and automatic arrival updates.</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="w-auto border-white/15 bg-white/10 text-white [color-scheme:dark]" />
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>Add appointment</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat icon={CalendarClock} label="Appointments" value={stats.total || 0} detail="Scheduled for this day" />
        <Stat icon={UsersRound} label="Waiting" value={stats.waiting || 0} detail="Checked in and ready" tone="amber" />
        <Stat icon={Stethoscope} label="In consultation" value={stats.inConsultation || 0} detail="Currently with a clinician" />
        <Stat icon={CheckCircle2} label="Completed" value={stats.completed || 0} detail="Visits completed today" tone="emerald" />
        <Stat icon={Clock3} label="Average wait" value={`${stats.averageWaitMinutes || 0}m`} detail="Measured check-in to call" tone="slate" />
      </div>

      {notice && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</div>}

      <Card className="overflow-hidden">
        <Card.Header className="flex flex-wrap items-center justify-between gap-3 px-5">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><ListChecks className="h-4.5 w-4.5" /></span><div><h2 className="font-semibold text-ink">Now serving</h2><p className="text-xs text-muted">The queue updates after every check-in, call, completion, and no-show.</p></div></div>
          <Badge tone="brand"><CircleDot className="mr-1 h-3 w-3" /> Live</Badge>
        </Card.Header>
        {(data?.queue || []).length ? <div>{data.queue.map((booking) => <QueueRow key={booking.id} booking={booking} busy={busyId === booking.id} onAction={action} onQr={setQrBooking} />)}</div> : <Card.Body className="flex flex-col items-center py-12 text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><UserCheck className="h-6 w-6" /></span><p className="mt-3 font-semibold text-ink">The live queue is clear</p><p className="mt-1 text-sm text-muted">Check in a scheduled patient to assign the next token.</p></Card.Body>}
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Card>
          <Card.Header className="flex flex-wrap items-center justify-between gap-3 px-5">
            <div><h2 className="font-semibold text-ink">Day schedule</h2><p className="text-xs text-muted">Appointments, arrivals, and visit status in one place.</p></div>
            <div className="relative w-full sm:w-64"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patients" className="h-9 pl-9" /></div>
          </Card.Header>
          <div className="divide-y divide-line">
            {filteredAppointments.map((booking) => (
              <div key={booking.id} className="grid items-center gap-3 px-5 py-4 md:grid-cols-[105px_minmax(0,1fr)_130px_auto]">
                <div><p className="text-sm font-semibold text-ink">{new Date(booking.slotIso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p><p className="text-xs text-muted">{booking.durationMinutes} min</p></div>
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{booking.name}</p><p className="truncate text-xs text-muted">{booking.phone || 'No phone'} · {booking.service}</p></div>
                <Badge tone={statusTone[booking.queueStatus] || 'neutral'}>{String(booking.queueStatus || 'scheduled').replace('_', ' ')}</Badge>
                <div className="flex justify-end gap-2">
                  {booking.queueStatus === 'scheduled' && <Button size="sm" loading={busyId === booking.id} leftIcon={<UserCheck className="h-4 w-4" />} onClick={() => action(booking.id, 'check_in')}>Check in</Button>}
                  {booking.queueStatus === 'no_show' && <Button size="sm" variant="secondary" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => action(booking.id, 'return_to_queue')}>Return</Button>}
                  <button onClick={() => setQrBooking(booking)} className="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted hover:bg-brand-50 hover:text-brand-700"><QrCode className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {!filteredAppointments.length && <div className="px-5 py-12 text-center text-sm text-muted">No appointments match this day and search.</div>}
          </div>
        </Card>

        <Card className="h-fit">
          <Card.Header className="flex items-center gap-2 px-5"><BellRing className="h-4 w-4 text-brand-600" /><span className="font-semibold text-ink">Arrival updates</span></Card.Header>
          <Card.Body className="space-y-3 px-5">
            {(data?.notifications || []).slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-2xl border border-line bg-canvas p-3.5">
                <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-xs font-semibold text-ink"><MessageCircleMore className="h-3.5 w-3.5 text-brand-600" />{item.phone}</span><Badge tone={item.status === 'sent_whatsapp' ? 'success' : item.status === 'delivery_failed' ? 'danger' : 'neutral'}>{item.status.replaceAll('_', ' ')}</Badge></div>
                <p className="mt-2 text-xs leading-5 text-muted">{item.message}</p>
              </div>
            ))}
            {!data?.notifications?.length && <div className="py-7 text-center"><MoreHorizontal className="mx-auto h-6 w-6 text-muted" /><p className="mt-2 text-sm font-medium text-ink">No queue alerts yet</p><p className="mt-1 text-xs text-muted">GrowCare records automatic WhatsApp updates here.</p></div>}
          </Card.Body>
        </Card>
      </div>

      <AppointmentFormModal open={adding} onClose={() => setAdding(false)} onCreated={() => { setAdding(false); load() }} />
      <Modal open={Boolean(qrBooking)} onClose={() => setQrBooking(null)} title="Patient QR check-in" className="max-w-sm">
        {qrBooking && <div className="text-center"><div className="mx-auto w-fit rounded-3xl border border-line bg-white p-5"><QRCodeSVG value={qrValue} size={190} bgColor="#fffefb" fgColor="#173b3a" level="M" /></div><p className="mt-4 font-semibold text-ink">{qrBooking.name}</p><p className="mt-1 text-sm text-muted">Scan at arrival to join today’s queue and receive a token.</p><div className="mt-4 rounded-xl bg-canvas px-3 py-2 text-xs text-muted">The check-in page runs from this clinic’s local GrowCare server.</div></div>}
      </Modal>
    </div>
  )
}
