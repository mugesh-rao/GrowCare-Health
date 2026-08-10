const crypto = require('crypto')
const express = require('express')
const store = require('../services/core/store')
const files = require('../services/clinical/files')
const patientExperience = require('../services/clinical/patientExperience')
const wa = require('../services/whatsapp/whatsappService')

const router = express.Router()
const patientPath = (uid, id) => `users/${uid}/patients/${id}`
const childPath = (uid, patientId, collection, id) => `${patientPath(uid, patientId)}/${collection}/${id}`
const plansPath = (uid, patientId) => `${patientPath(uid, patientId)}/afterVisitPlans`

async function patientOr404(req, res) {
  const patient = await store.getDoc(patientPath(req.user.uid, req.params.patientId))
  if (!patient) res.status(404).json({ message: 'Patient not found.' })
  return patient
}

function approvedPlanText(patient, plan) {
  const list = (label, values) => values?.length ? `${label}\n${values.map((value) => `• ${value}`).join('\n')}` : ''
  const medicines = plan.medicines?.length
    ? `Medicines\n${plan.medicines.map((medicine) => `• ${medicine.name} — ${medicine.dose}; ${medicine.timing}; ${medicine.duration}${medicine.purpose ? `; ${medicine.purpose}` : ''}`).join('\n')}`
    : ''
  return [
    `After-visit plan for ${patient.name}`,
    plan.plainLanguageSummary,
    list('What the clinician found', plan.findings),
    list('What changed today', plan.changesToday),
    medicines,
    list('Tests to complete', plan.testsToComplete),
    list('Foods or activities to avoid', plan.foodsOrActivitiesToAvoid),
    list('Warning signs', plan.warningSigns),
    plan.nextAppointment ? `Next appointment\n${plan.nextAppointment}` : '',
    'This plan was reviewed by the clinic. Contact the clinic if any instruction is unclear.',
  ].filter(Boolean).join('\n\n')
}

async function buildPassport(uid, patient) {
  const [encounters, artifacts, observations, alerts, plans, bookings] = await Promise.all([
    store.listDocs(`${patientPath(uid, patient.id)}/encounters`),
    store.listDocs(`${patientPath(uid, patient.id)}/artifacts`),
    store.listDocs(`${patientPath(uid, patient.id)}/observations`),
    store.listDocs(`${patientPath(uid, patient.id)}/alerts`),
    store.listDocs(plansPath(uid, patient.id)),
    store.listDocs(`users/${uid}/bookings`),
  ])
  const matchingBookings = bookings.filter((booking) => booking.patientId === patient.id || (patient.phone && booking.phone === patient.phone))
  const approvedPlans = plans.filter((plan) => plan.status === 'approved')
  const medications = [...new Map(encounters
    .flatMap((encounter) => encounter.note?.prescriptions || [])
    .map((item) => [String(item.drug || item.name || '').toLowerCase(), item])).values()]
    .filter((item) => item.drug || item.name)
  return {
    version: 1,
    generatedAt: Date.now(),
    patient: {
      id: patient.id, name: patient.name, mrn: patient.mrn, age: patient.age,
      gender: patient.gender, phone: patient.phone, specialty: patient.specialty,
      condition: patient.condition, emergencyContact: patient.emergencyContact || null,
    },
    emergencySummary: {
      name: patient.name,
      mrn: patient.mrn,
      conditions: [patient.condition, ...(patient.conditions || [])].filter(Boolean),
      allergies: patient.allergies || [],
      currentMedications: medications,
      emergencyContact: patient.emergencyContact || null,
    },
    conditions: [patient.condition, ...(patient.conditions || [])].filter(Boolean),
    allergies: patient.allergies || [],
    medications,
    vaccinations: patient.vaccinations || [],
    encounters: encounters.sort((a, b) => (b.occurredAt || 0) - (a.occurredAt || 0)),
    observations: observations.sort((a, b) => (b.observedAt || 0) - (a.observedAt || 0)),
    reports: artifacts.map(({ id, fileName, kind, mimeType, createdAt, sha256, byteSize }) => ({ id, fileName, kind, mimeType, createdAt, sha256, byteSize })),
    activeAlerts: alerts.filter((alert) => alert.status !== 'resolved'),
    afterVisitPlans: approvedPlans.sort((a, b) => (b.approvedAt || 0) - (a.approvedAt || 0)),
    upcomingFollowUps: matchingBookings.filter((booking) => new Date(booking.slotIso).getTime() >= Date.now() && booking.status !== 'cancelled'),
    sourceStatement: 'This package was generated from GrowCare local records. Verify clinical information against the original source documents.',
  }
}

router.get('/patients/:patientId/after-visit-plans', async (req, res) => {
  if (!(await patientOr404(req, res))) return
  const plans = await store.listDocs(plansPath(req.user.uid, req.params.patientId))
  plans.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
  res.json({ plans })
})

router.post('/patients/:patientId/after-visit-plans', async (req, res) => {
  const patient = await patientOr404(req, res)
  if (!patient) return
  const encounters = await store.listDocs(`${patientPath(req.user.uid, patient.id)}/encounters`)
  const encounter = req.body?.encounterId
    ? encounters.find((item) => item.id === req.body.encounterId)
    : encounters.sort((a, b) => (b.occurredAt || 0) - (a.occurredAt || 0))[0]
  if (!encounter) return res.status(400).json({ message: 'Approve a consultation note before creating an after-visit plan.' })
  const id = store.genId()
  const generated = await patientExperience.createDraft({
    uid: req.user.uid, patient, encounter, targetLanguage: req.body?.language || 'English',
  })
  const plan = {
    ...generated,
    encounterId: encounter.id,
    status: 'draft',
    clinicianReviewStatus: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await store.setDoc(childPath(req.user.uid, patient.id, 'afterVisitPlans', id), plan, false)
  res.status(201).json({ plan: { id, ...plan } })
})

router.patch('/patients/:patientId/after-visit-plans/:planId', async (req, res) => {
  if (!(await patientOr404(req, res))) return
  const path = childPath(req.user.uid, req.params.patientId, 'afterVisitPlans', req.params.planId)
  const existing = await store.getDoc(path)
  if (!existing) return res.status(404).json({ message: 'After-visit plan not found.' })
  if (existing.status === 'approved') return res.status(409).json({ message: 'Create a new draft to change an approved plan.' })
  const normalized = patientExperience.sanitizePlan({ ...existing, ...(req.body?.plan || {}) }, req.body?.plan?.language || existing.language)
  await store.setDoc(path, { ...normalized, status: 'draft', clinicianReviewStatus: 'in_review', updatedAt: Date.now() })
  res.json({ plan: await store.getDoc(path) })
})

router.post('/patients/:patientId/after-visit-plans/:planId/translate', async (req, res) => {
  const patient = await patientOr404(req, res)
  if (!patient) return
  const source = await store.getDoc(childPath(req.user.uid, patient.id, 'afterVisitPlans', req.params.planId))
  if (!source) return res.status(404).json({ message: 'After-visit plan not found.' })
  const targetLanguage = String(req.body?.language || '').trim()
  if (!targetLanguage) return res.status(400).json({ message: 'Choose a target language.' })
  try {
    const id = store.genId()
    const translated = await patientExperience.translatePlan({ uid: req.user.uid, patient, plan: source, targetLanguage })
    const plan = { ...translated, encounterId: source.encounterId, status: 'draft', clinicianReviewStatus: 'pending', createdAt: Date.now(), updatedAt: Date.now() }
    await store.setDoc(childPath(req.user.uid, patient.id, 'afterVisitPlans', id), plan, false)
    res.status(201).json({ plan: { id, ...plan } })
  } catch (error) {
    res.status(422).json({ message: error.message || 'Could not translate the plan.' })
  }
})

router.post('/patients/:patientId/after-visit-plans/:planId/approve', async (req, res) => {
  if (!(await patientOr404(req, res))) return
  const path = childPath(req.user.uid, req.params.patientId, 'afterVisitPlans', req.params.planId)
  const plan = await store.getDoc(path)
  if (!plan) return res.status(404).json({ message: 'After-visit plan not found.' })
  await store.setDoc(path, {
    status: 'approved', clinicianReviewStatus: 'approved', approvedAt: Date.now(),
    approvedBy: req.user.name, updatedAt: Date.now(),
  })
  res.json({ plan: await store.getDoc(path) })
})

router.post('/patients/:patientId/after-visit-plans/:planId/audio', async (req, res) => {
  if (!(await patientOr404(req, res))) return
  const path = childPath(req.user.uid, req.params.patientId, 'afterVisitPlans', req.params.planId)
  const plan = await store.getDoc(path)
  if (!plan) return res.status(404).json({ message: 'After-visit plan not found.' })
  if (plan.status !== 'approved') return res.status(400).json({ message: 'Approve the plan before creating patient audio.' })
  try {
    const audio = await patientExperience.generatePlanAudio({ uid: req.user.uid, patientId: req.params.patientId, planId: req.params.planId, plan })
    await store.setDoc(path, { audio, updatedAt: Date.now() })
    res.json({ audio })
  } catch (error) {
    res.status(422).json({ message: error.message || 'Could not generate patient audio.' })
  }
})

router.get('/patients/:patientId/after-visit-plans/:planId/audio', async (req, res) => {
  const plan = await store.getDoc(childPath(req.user.uid, req.params.patientId, 'afterVisitPlans', req.params.planId))
  if (!plan?.audio?.localPath) return res.status(404).json({ message: 'Audio is not available.' })
  try {
    const bytes = await files.readArtifact(req.params.patientId, plan.audio)
    res.type(plan.audio.mimeType || 'audio/mpeg').send(bytes)
  } catch {
    res.status(404).json({ message: 'The local audio file could not be read.' })
  }
})

router.post('/patients/:patientId/after-visit-plans/:planId/deliver', async (req, res) => {
  const patient = await patientOr404(req, res)
  if (!patient) return
  const path = childPath(req.user.uid, patient.id, 'afterVisitPlans', req.params.planId)
  const plan = await store.getDoc(path)
  if (!plan) return res.status(404).json({ message: 'After-visit plan not found.' })
  if (plan.status !== 'approved') return res.status(400).json({ message: 'Only a clinician-approved plan can be delivered.' })
  const phone = String(req.body?.phone || patient.phone || '').trim()
  if (!phone) return res.status(400).json({ message: 'Add a patient phone number before sending the plan.' })
  try {
    const sessions = await wa.listSessions(req.user.uid)
    const session = req.body?.sessionId ? sessions.find((item) => item.id === req.body.sessionId && item.status === 'connected') : sessions.find((item) => item.status === 'connected')
    if (!session) throw new Error('Connect WhatsApp before delivering the plan.')
    await wa.sendMessage(req.user.uid, session.id, phone, { text: approvedPlanText(patient, plan) })
    await store.setDoc(path, { deliveryStatus: 'sent_whatsapp', deliveredAt: Date.now(), deliveredTo: phone, updatedAt: Date.now() })
    res.json({ plan: await store.getDoc(path) })
  } catch (error) {
    res.status(422).json({ message: error.message })
  }
})

router.get('/patients/:patientId/passport', async (req, res) => {
  const patient = await patientOr404(req, res)
  if (!patient) return
  res.json({ passport: await buildPassport(req.user.uid, patient) })
})

router.post('/patients/:patientId/passport/share', async (req, res) => {
  const patient = await patientOr404(req, res)
  if (!patient) return
  const passport = await buildPassport(req.user.uid, patient)
  const token = crypto.randomBytes(18).toString('base64url')
  const expiresInMinutes = Math.max(5, Math.min(1440, Number(req.body?.expiresInMinutes) || 30))
  const snapshot = { patientId: patient.id, passport, createdAt: Date.now(), expiresAt: Date.now() + expiresInMinutes * 60000 }
  await store.setDoc(`users/${req.user.uid}/passportShares/${token}`, snapshot, false)
  res.status(201).json({ share: { token, expiresAt: snapshot.expiresAt, qrValue: `growcare://passport/${token}` } })
})

router.get('/shared-passports/:token', async (req, res) => {
  const share = await store.getDoc(`users/${req.user.uid}/passportShares/${req.params.token}`)
  if (!share || share.expiresAt < Date.now()) return res.status(404).json({ message: 'This passport share has expired or does not exist.' })
  res.json({ passport: share.passport, expiresAt: share.expiresAt })
})

router.post('/patients/:patientId/passport/export', async (req, res) => {
  const patient = await patientOr404(req, res)
  if (!patient) return
  const password = String(req.body?.password || '')
  if (password.length < 8) return res.status(400).json({ message: 'Use an export password with at least 8 characters.' })
  const passport = await buildPassport(req.user.uid, patient)
  const salt = crypto.randomBytes(16)
  const iv = crypto.randomBytes(12)
  const key = crypto.scryptSync(password, salt, 32)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(passport), 'utf8'), cipher.final()])
  const bundle = {
    format: 'growcare-passport', version: 1, algorithm: 'aes-256-gcm',
    salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'),
    data: ciphertext.toString('base64'),
  }
  res.json({ fileName: `${String(patient.mrn || patient.name).replace(/[^a-z0-9_-]/gi, '_')}-care-passport.growcare`, data: Buffer.from(JSON.stringify(bundle, null, 2)).toString('base64') })
})

module.exports = router
