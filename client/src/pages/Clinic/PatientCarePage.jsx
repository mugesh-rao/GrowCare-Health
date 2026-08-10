import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck2,
  ClipboardCheck,
  Download,
  FileArchive,
  FileHeart,
  FileText,
  Languages,
  LockKeyhole,
  MessageCircleMore,
  Pill,
  Plus,
  Printer,
  QrCode,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TestTube2,
  TriangleAlert,
  UserRoundCheck,
  Volume2,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, Input, Label, Modal, Spinner } from '../../components/atoms'
import useHeaderActions from '../../hooks/useHeaderActions'
import { clinicalApi } from '../../services/clinicalApi'

const languages = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Urdu']

function ListEditor({ label, value = [], onChange, placeholder, readOnly = false, icon: Icon }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-brand-600" />}
        <textarea
          className={`input-base min-h-24 resize-y ${Icon ? 'pl-10' : ''}`}
          value={value.join('\n')}
          onChange={(event) => onChange(event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      </div>
      {!readOnly && <p className="mt-1 text-xs text-muted">Use a new line for each item.</p>}
    </div>
  )
}

function MedicineEditor({ medicines = [], onChange, readOnly }) {
  const update = (index, field, value) => onChange(medicines.map((medicine, itemIndex) => itemIndex === index ? { ...medicine, [field]: value } : medicine))
  const remove = (index) => onChange(medicines.filter((_, itemIndex) => itemIndex !== index))
  return (
    <div>
      <div className="mb-2 flex items-center justify-between"><Label>Medicines</Label>{!readOnly && <button type="button" onClick={() => onChange([...medicines, { name: '', purpose: '', dose: '', timing: '', duration: '', instructions: '' }])} className="flex items-center gap-1 text-xs font-semibold text-brand-700"><Plus className="h-3.5 w-3.5" /> Add medicine</button>}</div>
      <div className="space-y-3">
        {medicines.map((medicine, index) => (
          <div key={`${medicine.name}-${index}`} className="rounded-2xl border border-line bg-canvas p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ['name', 'Medicine'], ['purpose', 'Purpose'], ['dose', 'Dose'],
                ['timing', 'Timing'], ['duration', 'Duration'], ['instructions', 'Instructions'],
              ].map(([field, label]) => <div key={field}><p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p><Input value={medicine[field] || ''} onChange={(event) => update(index, field, event.target.value)} readOnly={readOnly} /></div>)}
            </div>
            {!readOnly && <button type="button" onClick={() => remove(index)} className="mt-3 text-xs font-semibold text-red-600">Remove medicine</button>}
          </div>
        ))}
        {!medicines.length && <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">No medicines were documented for this visit.</div>}
      </div>
    </div>
  )
}

function PlanEditor({ plan, onChange, onSave, onApprove, onTranslate, onAudio, onDeliver, busy }) {
  const approved = plan.status === 'approved'
  const set = (field, value) => onChange({ ...plan, [field]: value })
  return (
    <div className="space-y-5">
      <div className="rounded-[22px] border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex items-center gap-2"><Badge tone={approved ? 'success' : 'warning'}>{approved ? 'Clinician approved' : 'Approval required'}</Badge><Badge tone="neutral">{plan.language}</Badge></div><h2 className="mt-3 text-xl font-bold text-ink">{plan.title}</h2><p className="mt-1 text-xs text-muted">Created {new Date(plan.createdAt).toLocaleString('en-IN')} · Source visit {plan.encounterId}</p></div>
          <div className="flex flex-wrap gap-2">
            {!approved && <Button variant="secondary" loading={busy === 'save'} onClick={onSave}>Save draft</Button>}
            {!approved && <Button loading={busy === 'approve'} leftIcon={<ShieldCheck className="h-4 w-4" />} onClick={onApprove}>Approve for patient</Button>}
            {approved && <Button variant="secondary" loading={busy === 'audio'} leftIcon={<Volume2 className="h-4 w-4" />} onClick={onAudio}>{plan.audio ? 'Play audio' : 'Create audio'}</Button>}
            {approved && <Button loading={busy === 'deliver'} leftIcon={<MessageCircleMore className="h-4 w-4" />} onClick={onDeliver}>Send on WhatsApp</Button>}
          </div>
        </div>
        {plan.aiDisclosure && <div className="mt-4 flex items-start gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-xs leading-5 text-brand-900"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />{plan.aiDisclosure}</div>}
        {plan.audio?.disclosure && <div className="mt-2 flex items-center gap-2 text-xs text-muted"><Volume2 className="h-3.5 w-3.5" />{plan.audio.disclosure}</div>}
      </div>

      <Card>
        <Card.Body className="space-y-5">
          <div><Label>Patient-friendly summary</Label><textarea className="input-base min-h-28 resize-y" value={plan.plainLanguageSummary || ''} onChange={(event) => set('plainLanguageSummary', event.target.value)} readOnly={approved} /></div>
          <div className="grid gap-5 xl:grid-cols-2">
            <ListEditor label="What the clinician found" value={plan.findings} onChange={(value) => set('findings', value)} icon={Stethoscope} readOnly={approved} />
            <ListEditor label="What changed today" value={plan.changesToday} onChange={(value) => set('changesToday', value)} icon={ClipboardCheck} readOnly={approved} />
          </div>
          <MedicineEditor medicines={plan.medicines} onChange={(value) => set('medicines', value)} readOnly={approved} />
          <div className="grid gap-5 xl:grid-cols-2">
            <ListEditor label="Tests to complete" value={plan.testsToComplete} onChange={(value) => set('testsToComplete', value)} icon={TestTube2} readOnly={approved} />
            <ListEditor label="Foods or activities to avoid" value={plan.foodsOrActivitiesToAvoid} onChange={(value) => set('foodsOrActivitiesToAvoid', value)} icon={AlertTriangle} readOnly={approved} />
            <ListEditor label="Warning signs requiring help" value={plan.warningSigns} onChange={(value) => set('warningSigns', value)} icon={TriangleAlert} readOnly={approved} />
            <ListEditor label="Questions the patient asked" value={plan.questionsAsked} onChange={(value) => set('questionsAsked', value)} icon={MessageCircleMore} readOnly={approved} />
          </div>
          <div><Label>Next appointment and follow-up</Label><textarea className="input-base min-h-20 resize-y" value={plan.nextAppointment || ''} onChange={(event) => set('nextAppointment', event.target.value)} readOnly={approved} /></div>
          <div><Label>Additional clinician note</Label><textarea className="input-base min-h-20 resize-y" value={plan.clinicianNote || ''} onChange={(event) => set('clinicianNote', event.target.value)} readOnly={approved} /></div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Languages className="h-5 w-5" /></span><div><p className="font-semibold text-ink">Create another language version</p><p className="text-sm text-muted">Every translated version remains a draft until a clinician approves it.</p></div></div>
          <div className="flex gap-2"><select id="plan-target-language" className="input-base w-40" defaultValue="Hindi">{languages.filter((language) => language !== plan.language).map((language) => <option key={language}>{language}</option>)}</select><Button variant="secondary" loading={busy === 'translate'} onClick={() => onTranslate(document.getElementById('plan-target-language').value)}>Translate</Button></div>
        </Card.Body>
      </Card>
    </div>
  )
}

function PassportSection({ title, icon: Icon, children, count }) {
  return <Card><Card.Header className="flex items-center justify-between px-5"><span className="flex items-center gap-2 font-semibold text-ink"><Icon className="h-4.5 w-4.5 text-brand-600" />{title}</span>{count !== undefined && <Badge tone="neutral">{count}</Badge>}</Card.Header><Card.Body className="px-5">{children}</Card.Body></Card>
}

function PatientPassport({ patient, passport, share, onShare, onExport, busy }) {
  if (!passport) return <Card><Card.Body className="grid place-items-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></Card.Body></Card>
  return (
    <div className="patient-care-print space-y-5">
      <section className="overflow-hidden rounded-[26px] bg-night-900 text-white">
        <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">GrowCare patient passport</p><h2 className="mt-2 text-2xl font-bold">{patient.name}</h2><p className="mt-1 text-sm text-white/65">{patient.mrn} · {patient.age || '—'} years · {patient.gender}</p><div className="mt-4 flex flex-wrap gap-2">{passport.conditions.map((item) => <span key={item} className="rounded-full bg-white/10 px-3 py-1 text-xs">{item}</span>)}{!passport.conditions.length && <span className="text-sm text-white/55">No conditions documented</span>}</div></div>
          <div className="flex flex-wrap gap-2 print:hidden"><Button variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print / Save PDF</Button><Button variant="secondary" loading={busy === 'share'} leftIcon={<QrCode className="h-4 w-4" />} onClick={onShare}>Temporary QR</Button><Button loading={busy === 'export'} leftIcon={<LockKeyhole className="h-4 w-4" />} onClick={onExport}>Encrypted export</Button></div>
        </div>
      </section>

      {share && <Card className="print:hidden"><Card.Body className="flex flex-col items-center gap-5 sm:flex-row"><div className="rounded-2xl border border-line bg-white p-3"><QRCodeSVG value={share.qrValue} size={126} bgColor="#fffefb" fgColor="#173b3a" /></div><div><Badge tone="success">Temporary share ready</Badge><p className="mt-2 font-semibold text-ink">Expires {new Date(share.expiresAt).toLocaleString('en-IN')}</p><p className="mt-1 max-w-xl text-sm text-muted">This QR contains a short-lived GrowCare exchange code. The patient record remains in the clinic’s local workspace.</p></div></Card.Body></Card>}

      <div className="grid gap-5 xl:grid-cols-2">
        <PassportSection title="Emergency summary" icon={FileHeart}>
          <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-canvas p-3"><p className="text-xs text-muted">Allergies</p><p className="mt-1 text-sm font-semibold text-ink">{passport.allergies.join(', ') || 'None documented'}</p></div><div className="rounded-xl bg-canvas p-3"><p className="text-xs text-muted">Emergency contact</p><p className="mt-1 text-sm font-semibold text-ink">{passport.patient.emergencyContact?.name || 'Not documented'}</p></div></div>
        </PassportSection>
        <PassportSection title="Current medicines" icon={Pill} count={passport.medications.length}>
          <div className="space-y-2">{passport.medications.map((medicine, index) => <div key={`${medicine.drug || medicine.name}-${index}`} className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2.5"><span className="text-sm font-semibold text-ink">{medicine.drug || medicine.name}</span><span className="text-xs text-muted">{medicine.dose} · {medicine.frequency}</span></div>)}{!passport.medications.length && <p className="text-sm text-muted">No medicines documented.</p>}</div>
        </PassportSection>
        <PassportSection title="Visits" icon={Stethoscope} count={passport.encounters.length}>
          <div className="space-y-3">{passport.encounters.slice(0, 8).map((encounter) => <div key={encounter.id} className="border-l-2 border-brand-300 pl-3"><p className="text-sm font-semibold text-ink">{encounter.title}</p><p className="text-xs text-muted">{new Date(encounter.occurredAt).toLocaleDateString('en-IN')} · {encounter.note?.diagnosis || encounter.note?.chiefComplaint || 'Clinical note'}</p></div>)}{!passport.encounters.length && <p className="text-sm text-muted">No completed visits.</p>}</div>
        </PassportSection>
        <PassportSection title="Reports and sources" icon={FileText} count={passport.reports.length}>
          <div className="space-y-2">{passport.reports.slice(0, 10).map((report) => <div key={report.id} className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2.5"><FileArchive className="h-4 w-4 text-brand-600" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{report.fileName}</p><p className="text-xs text-muted">{report.kind}</p></div></div>)}{!passport.reports.length && <p className="text-sm text-muted">No reports uploaded.</p>}</div>
        </PassportSection>
        <PassportSection title="Recent observations" icon={TestTube2} count={passport.observations.length}>
          <div className="grid gap-2 sm:grid-cols-2">{passport.observations.slice(0, 8).map((item) => <div key={item.id} className="rounded-xl bg-canvas p-3"><p className="text-xs text-muted">{item.name}</p><p className="mt-1 font-semibold text-ink">{item.value} {item.unit}</p></div>)}{!passport.observations.length && <p className="text-sm text-muted">No observations recorded.</p>}</div>
        </PassportSection>
        <PassportSection title="Upcoming follow-ups" icon={CalendarCheck2} count={passport.upcomingFollowUps.length}>
          <div className="space-y-2">{passport.upcomingFollowUps.map((booking) => <div key={booking.id} className="rounded-xl bg-canvas p-3"><p className="text-sm font-semibold text-ink">{booking.service}</p><p className="text-xs text-muted">{booking.slotLabel} · {booking.doctor || 'Clinic team'}</p></div>)}{!passport.upcomingFollowUps.length && <p className="text-sm text-muted">No follow-up appointment is currently booked.</p>}</div>
        </PassportSection>
      </div>
      <p className="px-1 text-xs leading-5 text-muted">{passport.sourceStatement}</p>
    </div>
  )
}

export default function PatientCarePage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [plans, setPlans] = useState([])
  const [passport, setPassport] = useState(null)
  const [activeTab, setActiveTab] = useState('plan')
  const [selectedId, setSelectedId] = useState('')
  const [editingPlan, setEditingPlan] = useState(null)
  const [language, setLanguage] = useState('English')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [share, setShare] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportPassword, setExportPassword] = useState('')

  useHeaderActions(<Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(`/dashboard/patients/${patientId}`)}>Back to patient</Button>, [patientId])

  const load = useCallback(async () => {
    const [record, nextPlans, nextPassport] = await Promise.all([
      clinicalApi.getPatient(patientId), clinicalApi.listAfterVisitPlans(patientId), clinicalApi.getPassport(patientId),
    ])
    setPatient(record); setPlans(nextPlans); setPassport(nextPassport)
    setSelectedId((current) => current || nextPlans[0]?.id || '')
  }, [patientId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch((error) => setNotice(error.message)) }, 0)
    return () => window.clearTimeout(timer)
  }, [load])
  const selected = useMemo(() => plans.find((plan) => plan.id === selectedId) || plans[0], [plans, selectedId])
  useEffect(() => {
    const timer = window.setTimeout(() => { if (selected) setEditingPlan(structuredClone(selected)) }, 0)
    return () => window.clearTimeout(timer)
  }, [selected])

  const run = async (name, task) => { setBusy(name); setNotice(''); try { await task(); await load() } catch (error) { setNotice(error.message) } finally { setBusy('') } }
  const createPlan = () => run('create', async () => { const plan = await clinicalApi.createAfterVisitPlan(patientId, { language }); setSelectedId(plan.id); setActiveTab('plan') })
  const savePlan = () => run('save', () => clinicalApi.updateAfterVisitPlan(patientId, editingPlan.id, editingPlan))
  const approvePlan = () => run('approve', () => clinicalApi.approveAfterVisitPlan(patientId, editingPlan.id))
  const translatePlan = (target) => run('translate', async () => { const plan = await clinicalApi.translateAfterVisitPlan(patientId, editingPlan.id, target); setSelectedId(plan.id) })
  const audioPlan = () => run('audio', async () => { if (!editingPlan.audio) await clinicalApi.generateAfterVisitAudio(patientId, editingPlan.id); const url = await clinicalApi.getAfterVisitAudio(patientId, editingPlan.id); const audio = new Audio(url); audio.onended = () => URL.revokeObjectURL(url); await audio.play() })
  const deliverPlan = () => run('deliver', () => clinicalApi.deliverAfterVisitPlan(patientId, editingPlan.id))
  const createShare = () => run('share', async () => setShare(await clinicalApi.createPassportShare(patientId, 30)))
  const exportPassport = () => run('export', async () => {
    const result = await clinicalApi.exportPassport(patientId, exportPassword)
    const bytes = Uint8Array.from(atob(result.data), (character) => character.charCodeAt(0))
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = result.fileName; link.click(); URL.revokeObjectURL(url)
    setExportOpen(false); setExportPassword('')
  })

  if (!patient) return <div className="grid h-full place-items-center"><Spinner className="h-8 w-8 text-brand-600" /></div>
  return (
    <div className="h-full overflow-y-auto pb-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <section className="rounded-[26px] border border-line bg-white px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Patient continuity</p><h1 className="mt-1 text-2xl font-bold text-ink">{patient.name}</h1><p className="mt-1 text-sm text-muted">Clinician-approved guidance and a portable local care record.</p></div><div className="flex rounded-2xl bg-canvas p-1"><button onClick={() => setActiveTab('plan')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === 'plan' ? 'bg-white text-ink' : 'text-muted'}`}><ClipboardCheck className="h-4 w-4" />After-visit plans</button><button onClick={() => setActiveTab('passport')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === 'passport' ? 'bg-white text-ink' : 'text-muted'}`}><FileHeart className="h-4 w-4" />Care passport</button></div></div>
        </section>
        {notice && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</div>}

        {activeTab === 'plan' ? <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="h-fit"><Card.Header className="px-4"><p className="font-semibold text-ink">Visit plans</p><p className="text-xs text-muted">Draft, review, approve, and deliver.</p></Card.Header><Card.Body className="space-y-2 px-3 py-3">{plans.map((plan) => <button key={plan.id} onClick={() => setSelectedId(plan.id)} className={`w-full rounded-2xl border px-3 py-3 text-left ${selected?.id === plan.id ? 'border-brand-300 bg-brand-50' : 'border-transparent hover:bg-canvas'}`}><div className="flex items-center justify-between"><Badge tone={plan.status === 'approved' ? 'success' : 'warning'}>{plan.status}</Badge><span className="text-[10px] text-muted">{plan.language}</span></div><p className="mt-2 line-clamp-2 text-sm font-semibold text-ink">{plan.title}</p><p className="mt-1 text-xs text-muted">{new Date(plan.createdAt).toLocaleDateString('en-IN')}</p></button>)}{!plans.length && <div className="py-6 text-center text-sm text-muted">No visit plan yet.</div>}<div className="border-t border-line pt-3"><Label>Plan language</Label><select className="input-base mb-2" value={language} onChange={(event) => setLanguage(event.target.value)}>{languages.map((item) => <option key={item}>{item}</option>)}</select><Button fullWidth loading={busy === 'create'} leftIcon={<Plus className="h-4 w-4" />} onClick={createPlan}>Create from latest visit</Button></div></Card.Body></Card>
          {editingPlan ? <PlanEditor plan={editingPlan} onChange={setEditingPlan} onSave={savePlan} onApprove={approvePlan} onTranslate={translatePlan} onAudio={audioPlan} onDeliver={deliverPlan} busy={busy} /> : <Card><Card.Body className="flex flex-col items-center py-20 text-center"><UserRoundCheck className="h-9 w-9 text-brand-600" /><p className="mt-3 font-semibold text-ink">Approve a visit first</p><p className="mt-1 max-w-md text-sm text-muted">A clinician-approved scribe note becomes the source for the patient’s after-visit plan.</p></Card.Body></Card>}
        </div> : <PatientPassport patient={patient} passport={passport} share={share} onShare={createShare} onExport={() => setExportOpen(true)} busy={busy} />}
      </div>
      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Encrypted Care Passport" className="max-w-md"><div className="space-y-4"><div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4"><LockKeyhole className="mt-0.5 h-5 w-5 text-brand-700" /><p className="text-sm leading-6 text-brand-900">GrowCare creates a password-protected local export using AES-256-GCM. Share the password separately from the file.</p></div><div><Label required>Export password</Label><Input type="password" value={exportPassword} onChange={(event) => setExportPassword(event.target.value)} placeholder="At least 8 characters" /></div><Button fullWidth loading={busy === 'export'} disabled={exportPassword.length < 8} leftIcon={<Download className="h-4 w-4" />} onClick={exportPassport}>Download encrypted package</Button></div></Modal>
    </div>
  )
}
