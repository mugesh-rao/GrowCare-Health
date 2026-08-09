import { useEffect, useState } from 'react'
import { CalendarClock, Check, X, Trash2, Plus } from 'lucide-react'
import { Card, Badge, Button, Input, Label, Spinner, Table } from '../../components/atoms'
import useRealtime from '../../hooks/useRealtime'
import bookingService from '../../services/bookingService'

const tone = { booked: 'brand', confirmed: 'success', cancelled: 'danger', completed: 'neutral' }

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', service: 'Consultation', slotIso: '' })
  const [error, setError] = useState('')

  const load = () => bookingService.list().then(setBookings)

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  useRealtime((evt) => {
    if (evt.type === 'booking') load()
  })

  const setStatus = async (id, status) => {
    await bookingService.update(id, { status })
    load()
  }

  const remove = async (id) => {
    await bookingService.remove(id)
    setBookings((current) => current.filter((item) => item.id !== id))
  }

  const create = async () => {
    setError('')
    if (!form.slotIso) {
      setError('Choose an appointment date and time.')
      return
    }
    try {
      const booking = await bookingService.create({ ...form, slotIso: new Date(form.slotIso).toISOString() })
      setBookings((current) => [...current, booking].sort((a, b) => new Date(a.slotIso) - new Date(b.slotIso)))
      setForm({ name: '', phone: '', service: 'Consultation', slotIso: '' })
      setAdding(false)
    } catch (requestError) { setError(requestError.message) }
  }

  return loading ? (
    <div className="grid place-items-center py-20">
      <Spinner className="h-8 w-8 text-brand-600" />
    </div>
  ) : (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold text-ink">Appointments</h2><p className="mt-1 text-sm text-muted">Create, confirm, reschedule, or cancel clinic appointments.</p></div><Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAdding((current) => !current)}>Add appointment</Button></div>
      {adding && <Card><Card.Body className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><Label>Patient name</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Patient name" /></div><div><Label>Phone</Label><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Optional" /></div><div><Label>Appointment type</Label><Input value={form.service} onChange={(event) => setForm({ ...form, service: event.target.value })} /></div><div><Label>Date and time</Label><Input type="datetime-local" value={form.slotIso} onChange={(event) => setForm({ ...form, slotIso: event.target.value })} /></div>{error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}<div className="flex gap-2 sm:col-span-2 lg:col-span-4"><Button onClick={create}>Save appointment</Button><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button></div></Card.Body></Card>}
      {bookings.length === 0 ? <Card>
      <Card.Body className="flex flex-col items-center gap-3 py-14 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
          <CalendarClock className="h-6 w-6" />
        </span>
        <div>
          <p className="font-semibold text-ink">No appointments yet</p>
          <p className="text-sm text-muted">
            Add an appointment manually to begin managing your clinic schedule.
          </p>
        </div>
      </Card.Body>
      </Card> : <Table>
      <Table.Head>
        <Table.Row>
          <Table.Th>When</Table.Th>
          <Table.Th>Visit type</Table.Th>
          <Table.Th>Patient</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th className="text-right">Actions</Table.Th>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {bookings.map((booking) => (
          <Table.Row key={booking.id}>
            <Table.Td className="font-medium">{booking.slotLabel || booking.slotIso}</Table.Td>
            <Table.Td className="capitalize">{booking.service}</Table.Td>
            <Table.Td>{booking.name || `+${booking.phone}`}</Table.Td>
            <Table.Td>
              <Badge tone={tone[booking.status] || 'neutral'}>{booking.status}</Badge>
            </Table.Td>
            <Table.Td>
              <div className="flex items-center justify-end gap-1">
                <button
                  title="Confirm"
                  onClick={() => setStatus(booking.id, 'confirmed')}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  title="Cancel"
                  onClick={() => setStatus(booking.id, 'cancelled')}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  title="Delete"
                  onClick={() => remove(booking.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Table.Td>
          </Table.Row>
        ))}
      </Table.Body>
      </Table>}
    </div>
  )
}
