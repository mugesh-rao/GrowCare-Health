import { useState } from 'react'
import { ChevronLeft, FileImage, FilePlus2, FileText, FlaskConical, Stethoscope } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Label } from '../../components/atoms'
import useHeaderActions from '../../hooks/useHeaderActions'
import { specialtyOptions } from '../../lib/clinicData'
import { clinicalApi } from '../../services/clinicalApi'

const RISK = [
  { value: 'Low',    active: 'border-emerald-500 bg-emerald-500 text-white', idle: 'border-line bg-white text-muted hover:border-emerald-400 hover:text-emerald-700' },
  { value: 'Medium', active: 'border-amber-500 bg-amber-500 text-white',    idle: 'border-line bg-white text-muted hover:border-amber-400 hover:text-amber-700' },
  { value: 'High',   active: 'border-red-500 bg-red-500 text-white',        idle: 'border-line bg-white text-muted hover:border-red-400 hover:text-red-700' },
]

const STATUS = [
  { value: 'New' },
  { value: 'Active' },
  { value: 'Monitoring' },
]

const UPLOADS = [
  { id: 'reports',       Icon: FlaskConical, label: 'Lab reports',     hint: 'PDFs, panels, blood work',       accept: '.pdf,.csv,.xlsx' },
  { id: 'prescriptions', Icon: FileText,     label: 'Prescriptions',   hint: 'Scanned notes or photos',        accept: '.pdf,.jpg,.jpeg,.png' },
  { id: 'imaging',       Icon: FileImage,    label: 'Imaging & scans', hint: 'Radiology, DICOM references',    accept: '.dcm,.pdf,.jpg,.png' },
]

const initial = {
  name: '', mrn: '', age: '', phone: '', gender: 'Female',
  specialty: 'General Medicine', doctor: '', risk: 'Low', status: 'New',
}

export default function NewPatientPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [files, setFiles] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useHeaderActions(
    <div className="flex items-center gap-2">
      <Button variant="secondary" leftIcon={<ChevronLeft className="h-4 w-4" />} onClick={() => navigate('/dashboard/patients')}>
        All patients
      </Button>
    </div>,
  )

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const createPatient = async () => {
    if (!form.name.trim()) {
      setError('Enter the patient name before creating the record.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const patient = await clinicalApi.createPatient(form)
      const selectedFiles = Object.entries(files).filter(([, file]) => file)
      await Promise.all(selectedFiles.map(async ([kind, file]) => {
        const sourceText = file.type.startsWith('text/') ? await file.text() : `Uploaded ${file.name}. Review the original file in the local clinic workspace.`
        return clinicalApi.addArtifact(patient.id, { fileName: file.name, kind, mimeType: file.type, sourceText })
      }))
      navigate(`/dashboard/patients/${patient.id}`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Left column — patient info */}
        <div className="rounded-[24px] border border-line bg-white p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Patient details</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label required>Patient name</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Aarav Mehta" />
            </div>
            <div>
              <Label required>Patient ID / MRN</Label>
              <Input value={form.mrn} onChange={e => set('mrn', e.target.value)} placeholder="GC-1025" />
            </div>
            <div>
              <Label>Age</Label>
              <Input type="number" value={form.age} onChange={e => set('age', e.target.value)} placeholder="54" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div>
              <Label>Gender</Label>
              <select className="input-base" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="border-t border-line" />

          <div>
            <Label>Clinical department</Label>
            <div className="relative mt-2">
              <Stethoscope className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <select className="input-base w-full pl-9" value={form.specialty} onChange={e => set('specialty', e.target.value)}>
                {specialtyOptions.filter((option) => option !== 'All specialties').map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label>Assigned doctor</Label>
            <Input value={form.doctor} onChange={e => set('doctor', e.target.value)} placeholder="Dr. Nivedita Rao" />
          </div>
        </div>

        {/* Right column — clinical + uploads + CTA */}
        <div className="rounded-[24px] border border-line bg-white p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Clinical & documents</p>
          </div>

          {/* Risk */}
          <div>
            <Label>Risk level</Label>
            <div className="mt-2 flex gap-2">
              {RISK.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set('risk', r.value)}
                  className={
                    'flex-1 rounded-xl border-2 py-2.5 text-sm font-bold transition ' +
                    (form.risk === r.value ? r.active : r.idle)
                  }
                >
                  {r.value}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <Label>Status</Label>
            <select className="input-base mt-2 w-full" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUS.map((option) => <option key={option.value}>{option.value}</option>)}
            </select>
          </div>

          <div className="border-t border-line" />

          {/* Uploads */}
          <div>
            <Label>Attach documents <span className="font-normal text-muted">(optional)</span></Label>
            <div className="mt-2 space-y-2">
              {UPLOADS.map(slot => {
                const file = files[slot.id]
                return (
                  <label
                    key={slot.id}
                    htmlFor={`upload-${slot.id}`}
                    className={
                      'group flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3 transition ' +
                      (file
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-line bg-canvas hover:border-brand-300 hover:bg-brand-50/50')
                    }
                  >
                    <span className={
                      'grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ' +
                      (file ? 'bg-brand-100 text-brand-700' : 'bg-white text-brand-600 group-hover:bg-brand-100')
                    }>
                      <slot.Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{slot.label}</p>
                      <p className={`truncate text-xs ${file ? 'font-medium text-brand-600' : 'text-muted'}`}>
                        {file ? file.name : slot.hint}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-muted group-hover:text-brand-600">
                      {file ? 'Change' : 'Browse'}
                    </span>
                    <input
                      id={`upload-${slot.id}`}
                      type="file"
                      accept={slot.accept}
                      className="hidden"
                      onChange={e => setFiles(prev => ({ ...prev, [slot.id]: e.target.files?.[0] || null }))}
                    />
                  </label>
                )
              })}
            </div>
          </div>

          <div className="border-t border-line" />

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button fullWidth size="lg" leftIcon={<FilePlus2 className="h-5 w-5" />} onClick={createPatient} disabled={saving}>
            {saving ? 'Creating local record…' : 'Create patient'}
          </Button>
        </div>

      </div>
    </div>
  )
}
