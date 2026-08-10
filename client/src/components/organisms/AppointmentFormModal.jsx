import { useEffect, useState } from 'react'
import { CalendarPlus, UserRoundSearch } from 'lucide-react'
import { Button, Input, Label, Modal } from '../atoms'
import bookingService from '../../services/bookingService'
import { clinicalApi } from '../../services/clinicalApi'

const initialForm = {
  name: '',
  patientId: '',
  phone: '',
  service: 'Consultation',
  slotIso: '',
  durationMinutes: '30',
  notes: '',
  doctor: '',
}

/** Reusable appointment creation dialog used wherever a clinic schedule is shown. */
export default function AppointmentFormModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [patients, setPatients] = useState([])

  useEffect(() => {
    if (!open) return
    clinicalApi.listPatients().then(setPatients).catch(() => setPatients([]))
  }, [open])

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  const selectPatient = (event) => {
    const patientId = event.target.value
    const patient = patients.find((item) => item.id === patientId)
    setForm((current) => ({
      ...current,
      patientId,
      ...(patient ? { name: patient.name, phone: patient.phone || current.phone } : {}),
    }))
  }

  const close = () => {
    setForm(initialForm)
    setError('')
    setSaving(false)
    onClose?.()
  }

  const save = async (event) => {
    event.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Enter the patient name.')
    if (!form.slotIso) return setError('Choose an appointment date and time.')

    setSaving(true)
    try {
      const booking = await bookingService.create({
        ...form,
        slotIso: new Date(form.slotIso).toISOString(),
        durationMinutes: Number(form.durationMinutes),
      })
      onCreated?.(booking)
      close()
    } catch (requestError) {
      setError(requestError.message || 'Could not save the appointment. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Add appointment" className="max-w-xl">
      <form className="space-y-5" onSubmit={save}>
        <p className="-mt-1 text-sm text-muted">Schedule a patient visit and keep it in the clinic calendar.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Existing patient</Label>
            <div className="relative">
              <UserRoundSearch className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
              <select className="input-base pl-9" value={form.patientId} onChange={selectPatient}>
                <option value="">New or unlinked appointment</option>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.mrn}</option>)}
              </select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label required>Patient name</Label>
            <Input value={form.name} onChange={update('name')} placeholder="e.g. Priya Sharma" autoFocus />
          </div>
          <div>
            <Label>Phone number</Label>
            <Input value={form.phone} onChange={update('phone')} placeholder="e.g. 98765 43210" inputMode="tel" />
          </div>
          <div>
            <Label>Visit type</Label>
            <select className="input-base" value={form.service} onChange={update('service')}>
              <option>Consultation</option>
              <option>Follow-up</option>
              <option>Procedure</option>
              <option>Video consultation</option>
            </select>
          </div>
          <div>
            <Label required>Date and time</Label>
            <Input type="datetime-local" value={form.slotIso} onChange={update('slotIso')} />
          </div>
          <div>
            <Label>Duration</Label>
            <select className="input-base" value={form.durationMinutes} onChange={update('durationMinutes')}>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>Doctor</Label>
            <Input value={form.doctor} onChange={update('doctor')} placeholder="Assign a clinician (optional)" />
          </div>
        </div>
        <div>
          <Label>Note for the clinic</Label>
          <textarea className="input-base min-h-20 resize-y" value={form.notes} onChange={update('notes')} placeholder="Reason for visit, preparation, or internal note" />
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={close} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving} leftIcon={<CalendarPlus className="h-4 w-4" />}>Save appointment</Button>
        </div>
      </form>
    </Modal>
  )
}
