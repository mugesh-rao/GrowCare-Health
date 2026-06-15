import { useEffect, useState } from 'react'
import { CalendarClock, Check, X, Trash2 } from 'lucide-react'
import { Card, Badge, Spinner, Table } from '../../components/atoms'
import useRealtime from '../../hooks/useRealtime'
import bookingService from '../../services/bookingService'

const tone = { booked: 'brand', confirmed: 'success', cancelled: 'danger', completed: 'neutral' }

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

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

  return loading ? (
    <div className="grid place-items-center py-20">
      <Spinner className="h-8 w-8 text-brand-600" />
    </div>
  ) : bookings.length === 0 ? (
    <Card>
      <Card.Body className="flex flex-col items-center gap-3 py-14 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600">
          <CalendarClock className="h-6 w-6" />
        </span>
        <div>
          <p className="font-semibold text-ink">No appointments yet</p>
          <p className="text-sm text-muted">
            Add a Booking node to a care workflow and confirmed patient appointments will
            appear here.
          </p>
        </div>
      </Card.Body>
    </Card>
  ) : (
    <Table>
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
    </Table>
  )
}
