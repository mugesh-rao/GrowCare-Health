const express = require('express')
const store = require('../services/store')
const ai = require('../services/aiService')

const router = express.Router()

const patientPath = (uid, id) => `users/${uid}/patients/${id}`
const childPath = (uid, patientId, collection, id) =>
  `${patientPath(uid, patientId)}/${collection}/${id}`
const now = () => Date.now()
const isoDate = (value = now()) => new Date(value).toISOString()
const displayDate = (value = now()) => new Date(value).toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric',
})

function valueStatus(name, value) {
  const ranges = {
    haemoglobin: [12, 17.5], hemoglobin: [12, 17.5], creatinine: [0.6, 1.3],
    sodium: [135, 145], potassium: [3.5, 5.1], hba1c: [0, 7],
    glucose: [70, 140], tsh: [0.4, 4],
  }
  const range = ranges[String(name).toLowerCase().replace(/\s/g, '')]
  if (!range || Number.isNaN(Number(value))) return 'normal'
  return Number(value) < range[0] ? 'low' : Number(value) > range[1] ? 'high' : 'normal'
}

function extractObservations(sourceText = '') {
  const text = String(sourceText)
  const definitions = [
    ['HbA1c', /hba1c\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*%?/i, '%'],
    ['Fasting glucose', /(?:fasting\s*)?(?:blood\s*)?glucose\s*[:=-]?\s*(\d+(?:\.\d+)?)/i, 'mg/dL'],
    ['Creatinine', /creatinine\s*[:=-]?\s*(\d+(?:\.\d+)?)/i, 'mg/dL'],
    ['Haemoglobin', /(?:haemoglobin|hemoglobin|hb)\s*[:=-]?\s*(\d+(?:\.\d+)?)/i, 'g/dL'],
    ['Sodium', /sodium\s*[:=-]?\s*(\d+(?:\.\d+)?)/i, 'mEq/L'],
    ['Potassium', /potassium\s*[:=-]?\s*(\d+(?:\.\d+)?)/i, 'mEq/L'],
    ['TSH', /tsh\s*[:=-]?\s*(\d+(?:\.\d+)?)/i, 'mIU/L'],
    ['Blood pressure', /(?:bp|blood pressure)\s*[:=-]?\s*(\d{2,3}\s*\/\s*\d{2,3})/i, 'mmHg'],
    ['Weight', /weight\s*[:=-]?\s*(\d+(?:\.\d+)?)/i, 'kg'],
  ]
  return definitions.flatMap(([name, pattern, unit]) => {
    const match = text.match(pattern)
    if (!match) return []
    return [{ name, value: match[1].replace(/\s/g, ''), unit, status: valueStatus(name, match[1]) }]
  })
}

function extractMedications(text = '') {
  const medicationPattern = /\b([A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]{2,})?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|units?))(?:\s*[-–—,]?\s*([0-9]-[0-9]-[0-9]|once daily|twice daily|daily|od|bd|tid))?/g
  const excluded = new Set(['Blood Pressure', 'Follow Up', 'Chief Complaint'])
  return [...String(text).matchAll(medicationPattern)].flatMap((match) => {
    const drug = match[1].trim()
    if (excluded.has(drug)) return []
    return [{ drug, dose: match[2].trim(), frequency: match[3] || 'As directed', route: 'Oral', duration: 'Clinician to confirm' }]
  }).slice(0, 12)
}

function section(text, labels) {
  const match = String(text).match(new RegExp(`(?:${labels.join('|')})\\s*[:\\-]\\s*([^\\n.]+(?:\\.[^\\n]+)?)`, 'i'))
  return match?.[1]?.trim() || ''
}

function makeDraftNote(transcript, patient) {
  const complaint = section(transcript, ['chief complaint', 'complaint', 'symptoms']) ||
    `Consultation for ${patient.condition || patient.specialty || 'clinical review'}.`
  const examination = section(transcript, ['examination', 'exam', 'findings']) || 'To be completed by clinician.'
  const diagnosis = section(transcript, ['diagnosis', 'assessment', 'impression']) || 'Clinician review required.'
  const followUp = section(transcript, ['follow[- ]?up', 'plan', 'advice']) || 'Follow-up plan to be confirmed by clinician.'
  return {
    chiefComplaint: complaint,
    examination,
    diagnosis,
    prescriptions: extractMedications(transcript),
    followUp,
    generatedAt: now(),
    disclaimer: 'Draft generated from the recorded/transcribed conversation. A licensed clinician must review and approve every field.',
  }
}

function buildPatientSummary(patient, encounters, artifacts, observations, alerts) {
  const latest = encounters.sort((a, b) => (b.occurredAt || 0) - (a.occurredAt || 0))[0]
  const flagged = alerts.filter((alert) => alert.status !== 'resolved')
  const metrics = observations.slice(-4).reverse().map((observation) => ({
    label: observation.name,
    value: `${observation.value}${observation.unit ? ` ${observation.unit}` : ''}`,
    tone: observation.status === 'high' || observation.status === 'low' ? 'warning' : 'success',
    change: observation.status === 'normal' ? 'In reference range' : `${observation.status} — clinician review`,
  }))
  const note = latest?.note || {}
  return {
    ...patient,
    totalVisits: encounters.length,
    totalReports: artifacts.length,
    lastVisit: latest ? displayDate(latest.occurredAt) : 'No visits yet',
    lastVisitIso: latest ? new Date(latest.occurredAt).toISOString().slice(0, 10) : null,
    condition: patient.condition || note.diagnosis || 'Clinical record being established',
    summary: latest?.note?.diagnosis
      ? `Latest clinician-approved assessment: ${latest.note.diagnosis}`
      : 'No approved clinical note yet. Start a visit or add a report to build this record.',
    metrics,
    alerts: flagged.map((alert) => ({ tone: alert.severity === 'high' ? 'danger' : 'warning', title: alert.title, detail: alert.detail })),
    betweenVisitAlerts: flagged.filter((alert) => alert.kind === 'between_visit'),
    visits: encounters.sort((a, b) => (b.occurredAt || 0) - (a.occurredAt || 0)).map((encounter) => ({
      id: encounter.id,
      date: displayDate(encounter.occurredAt),
      title: encounter.title || 'Clinical visit',
      detail: encounter.note?.diagnosis || encounter.note?.chiefComplaint || 'Clinical note awaiting review.',
      badge: encounter.status === 'approved' ? 'Completed' : 'Draft',
    })),
    prescriptions: latest?.note?.prescriptions || [],
    appointments: patient.appointments || [],
    chat: patient.chat || [],
    documents: artifacts.map((artifact) => ({ name: artifact.fileName, type: artifact.kind, uploadedAt: displayDate(artifact.createdAt) })),
    progressionSignal: observations.length
      ? `${observations.length} extracted observation${observations.length === 1 ? '' : 's'} are available for trend review. Values outside reference ranges remain clinician-review alerts.`
      : 'Add a report or approve a visit note to begin the longitudinal timeline.',
    briefingCard: {
      flagLevel: flagged.some((alert) => alert.severity === 'high') ? 'red' : flagged.length ? 'amber' : 'green',
      aiSummary: latest?.note?.diagnosis
        ? `Last clinician-approved note: ${latest.note.diagnosis}. ${flagged.length ? `${flagged.length} active clinical review alert(s).` : 'No active alerts.'}`
        : 'No approved visit note yet. Review any uploaded reports and establish today’s clinical baseline.',
      medicationCompliance: 'Not documented',
      labStatus: metrics[0] ? `${metrics[0].label}: ${metrics[0].value}` : 'No extracted results yet',
      recommendedFocus: flagged[0]?.detail || 'Confirm history, examination, assessment, and follow-up plan.',
    },
    chart: {
      observations: observations.sort((a, b) => (a.observedAt || 0) - (b.observedAt || 0)),
      artifacts,
      encounters,
      alerts: flagged,
    },
  }
}

async function getPatientBundle(uid, patientId) {
  const patient = await store.getDoc(patientPath(uid, patientId))
  if (!patient) return null
  const [encounters, artifacts, observations, alerts, sessions] = await Promise.all([
    store.listDocs(`${patientPath(uid, patientId)}/encounters`),
    store.listDocs(`${patientPath(uid, patientId)}/artifacts`),
    store.listDocs(`${patientPath(uid, patientId)}/observations`),
    store.listDocs(`${patientPath(uid, patientId)}/alerts`),
    store.listDocs(`${patientPath(uid, patientId)}/scribeSessions`),
  ])
  return buildPatientSummary(patient, encounters, artifacts, observations, alerts, sessions)
}

async function createAlerts(uid, patientId, observations, sourceLabel) {
  const alerts = []
  for (const observation of observations) {
    if (observation.status === 'normal') continue
    const id = store.genId()
    const alert = {
      title: `${observation.name} ${observation.status === 'high' ? 'above' : 'below'} reference range`,
      detail: `${observation.value} ${observation.unit || ''} extracted from ${sourceLabel}. Verify against the original source and clinical context.`,
      severity: 'medium', kind: 'result_review', status: 'open', createdAt: now(),
    }
    await store.setDoc(childPath(uid, patientId, 'alerts', id), alert)
    alerts.push({ id, ...alert })
  }
  return alerts
}

router.get('/patients', async (req, res) => {
  const patients = await store.listDocs(`users/${req.user.uid}/patients`)
  const bundles = await Promise.all(patients.map((patient) => getPatientBundle(req.user.uid, patient.id)))
  res.json({ patients: bundles.filter(Boolean) })
})

router.post('/patients', async (req, res) => {
  const body = req.body || {}
  if (!String(body.name || '').trim()) return res.status(400).json({ message: 'Patient name is required.' })
  const id = store.genId()
  const patient = {
    name: String(body.name).trim(), mrn: String(body.mrn || `GC-${id.slice(-5)}`).trim(),
    age: body.age ? Number(body.age) : null, phone: String(body.phone || '').trim(), gender: body.gender || 'Not specified',
    specialty: body.specialty || 'General Medicine', doctor: body.doctor || 'Clinic doctor',
    risk: body.risk || 'Low', status: body.status || 'New', condition: String(body.condition || '').trim(),
    tags: Array.isArray(body.tags) ? body.tags : [], createdAt: now(), updatedAt: now(),
  }
  await store.setDoc(patientPath(req.user.uid, id), patient, false)
  res.status(201).json({ patient: await getPatientBundle(req.user.uid, id) })
})

router.get('/patients/:patientId', async (req, res) => {
  const patient = await getPatientBundle(req.user.uid, req.params.patientId)
  if (!patient) return res.status(404).json({ message: 'Patient not found.' })
  res.json({ patient })
})

router.patch('/patients/:patientId', async (req, res) => {
  const path = patientPath(req.user.uid, req.params.patientId)
  if (!(await store.getDoc(path))) return res.status(404).json({ message: 'Patient not found.' })
  const allowed = ['name', 'mrn', 'age', 'phone', 'gender', 'specialty', 'doctor', 'risk', 'status', 'condition', 'tags']
  const update = Object.fromEntries(allowed.filter((key) => req.body?.[key] !== undefined).map((key) => [key, req.body[key]]))
  await store.setDoc(path, { ...update, updatedAt: now() })
  res.json({ patient: await getPatientBundle(req.user.uid, req.params.patientId) })
})

router.post('/patients/:patientId/artifacts', async (req, res) => {
  const uid = req.user.uid
  if (!(await store.getDoc(patientPath(uid, req.params.patientId)))) return res.status(404).json({ message: 'Patient not found.' })
  const body = req.body || {}
  const id = store.genId()
  const sourceText = String(body.sourceText || '').slice(0, 200000)
  const artifact = {
    fileName: String(body.fileName || 'Clinical note').slice(0, 180), kind: body.kind || 'Clinical document',
    mimeType: body.mimeType || 'text/plain', sourceText, fileData: String(body.fileData || '').slice(0, 14000000),
    createdAt: now(), extractionStatus: 'completed',
  }
  await store.setDoc(childPath(uid, req.params.patientId, 'artifacts', id), artifact, false)
  const extracted = extractObservations(sourceText)
  const observations = []
  for (const item of extracted) {
    const observationId = store.genId()
    const observation = { ...item, observedAt: now(), sourceArtifactId: id, source: artifact.fileName }
    await store.setDoc(childPath(uid, req.params.patientId, 'observations', observationId), observation, false)
    observations.push({ id: observationId, ...observation })
  }
  const alerts = await createAlerts(uid, req.params.patientId, observations, artifact.fileName)
  res.status(201).json({ artifact: { id, ...artifact }, observations, alerts, patient: await getPatientBundle(uid, req.params.patientId) })
})

router.post('/patients/:patientId/scribe/start', async (req, res) => {
  const uid = req.user.uid
  const patient = await store.getDoc(patientPath(uid, req.params.patientId))
  if (!patient) return res.status(404).json({ message: 'Patient not found.' })
  const id = store.genId()
  const session = { patientId: req.params.patientId, status: 'recording', language: req.body?.language || 'auto', consentConfirmed: Boolean(req.body?.consentConfirmed), transcript: '', startedAt: now(), updatedAt: now() }
  if (!session.consentConfirmed) return res.status(400).json({ message: 'Confirm patient consent before starting ambient capture.' })
  await store.setDoc(childPath(uid, req.params.patientId, 'scribeSessions', id), session, false)
  res.status(201).json({ session: { id, ...session } })
})

router.patch('/patients/:patientId/scribe/:sessionId', async (req, res) => {
  const path = childPath(req.user.uid, req.params.patientId, 'scribeSessions', req.params.sessionId)
  const session = await store.getDoc(path)
  if (!session) return res.status(404).json({ message: 'Scribe session not found.' })
  const transcript = String(req.body?.transcript ?? session.transcript ?? '').slice(0, 200000)
  await store.setDoc(path, { transcript, updatedAt: now() })
  res.json({ session: await store.getDoc(path) })
})

router.post('/patients/:patientId/scribe/:sessionId/stop', async (req, res) => {
  const uid = req.user.uid
  const path = childPath(uid, req.params.patientId, 'scribeSessions', req.params.sessionId)
  const session = await store.getDoc(path)
  const patient = await store.getDoc(patientPath(uid, req.params.patientId))
  if (!session || !patient) return res.status(404).json({ message: 'Scribe session or patient not found.' })
  const transcript = String(req.body?.transcript ?? session.transcript ?? '').slice(0, 200000)
  const localDraft = makeDraftNote(transcript, patient)
  const aiDraft = await ai.generateScribeDraft({ uid, transcript, patient })
  const draft = aiDraft
    ? { ...localDraft, ...aiDraft, generatedAt: now(), generatedWith: 'Configured local OpenAI key' }
    : localDraft
  await store.setDoc(path, { status: 'review', transcript, draft, stoppedAt: now(), updatedAt: now() })
  res.json({ session: await store.getDoc(path) })
})

router.post('/patients/:patientId/scribe/:sessionId/approve', async (req, res) => {
  const uid = req.user.uid
  const sessionPath = childPath(uid, req.params.patientId, 'scribeSessions', req.params.sessionId)
  const session = await store.getDoc(sessionPath)
  const patient = await store.getDoc(patientPath(uid, req.params.patientId))
  if (!patient) return res.status(404).json({ message: 'Patient not found.' })
  if (!session || session.status !== 'review') return res.status(400).json({ message: 'A scribe draft must be ready for clinician review before approval.' })
  const note = { ...session.draft, ...(req.body?.note || {}), approvedAt: now(), approvedBy: req.user.name }
  const encounterId = store.genId()
  const encounter = { title: 'Ambient scribe visit', status: 'approved', occurredAt: now(), note, sourceSessionId: session.id }
  await store.setDoc(childPath(uid, req.params.patientId, 'encounters', encounterId), encounter, false)
  const observations = extractObservations([note.chiefComplaint, note.examination, note.diagnosis, note.followUp].join('\n'))
  for (const item of observations) await store.setDoc(childPath(uid, req.params.patientId, 'observations', store.genId()), { ...item, observedAt: now(), sourceEncounterId: encounterId, source: 'Ambient scribe note' }, false)
  await store.setDoc(sessionPath, { status: 'approved', approvedEncounterId: encounterId, approvedAt: now() })
  const summaryId = store.genId()
  const summary = {
    body: String(req.body?.summary || `Visit summary for ${patient.name}: ${note.diagnosis || 'Clinician-approved consultation note.'}`),
    language: req.body?.language || 'English', channel: 'WhatsApp', status: 'queued_local', createdAt: now(), encounterId,
  }
  await store.setDoc(childPath(uid, req.params.patientId, 'patientSummaries', summaryId), summary, false)
  res.json({ encounter: { id: encounterId, ...encounter }, summary: { id: summaryId, ...summary }, patient: await getPatientBundle(uid, req.params.patientId) })
})

router.post('/patients/:patientId/chat', async (req, res) => {
  const patient = await getPatientBundle(req.user.uid, req.params.patientId)
  if (!patient) return res.status(404).json({ message: 'Patient not found.' })
  const question = String(req.body?.question || '').trim()
  const sources = patient.chart.artifacts.map((artifact) => artifact.fileName)
  const metrics = patient.chart.observations.slice(-5).map((item) => `${item.name} ${item.value} ${item.unit || ''}`).join(', ')
  const answer = `Record summary: ${patient.briefingCard.aiSummary} ${metrics ? `Recent extracted observations: ${metrics}.` : ''} ${sources.length ? `Sources: ${sources.join(', ')}.` : ''} This is contextual record support only; verify against original documents and clinical judgment.`
  res.json({ answer, question })
})

router.get('/patients/:patientId/fhir', async (req, res) => {
  const patient = await getPatientBundle(req.user.uid, req.params.patientId)
  if (!patient) return res.status(404).json({ message: 'Patient not found.' })
  res.json({ resourceType: 'Bundle', type: 'collection', entry: [
    { resource: { resourceType: 'Patient', id: patient.id, identifier: [{ value: patient.mrn }], name: [{ text: patient.name }], gender: String(patient.gender || '').toLowerCase(), telecom: [{ system: 'phone', value: patient.phone }] } },
    ...patient.chart.observations.map((observation) => ({ resource: { resourceType: 'Observation', id: observation.id, status: 'final', code: { text: observation.name }, valueQuantity: { value: Number(observation.value) || observation.value, unit: observation.unit }, effectiveDateTime: isoDate(observation.observedAt) } })),
  ] })
})

module.exports = router
