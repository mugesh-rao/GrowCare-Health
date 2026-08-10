const store = require('../core/store')
const files = require('./files')
const { DEFAULT_CLINICAL_MODEL, clientFor } = require('./agents/runtime')
const { draftAfterVisitPlan, translateAfterVisitPlan } = require('./agents/afterVisitAgent')

const now = () => Date.now()

async function settingsFor(uid) {
  const user = await store.getDoc(`users/${uid}`)
  return user?.aiSettings || {}
}

function normalizeMedicine(item = {}) {
  return {
    name: String(item.name || item.drug || ''),
    purpose: String(item.purpose || 'Not documented'),
    dose: String(item.dose || 'Not documented'),
    timing: String(item.timing || item.frequency || 'Not documented'),
    duration: String(item.duration || 'Not documented'),
    instructions: String(item.instructions || item.route || ''),
  }
}

function localAfterVisitPlan(patient, encounter, targetLanguage = 'English') {
  const note = encounter?.note || {}
  return {
    title: `After-visit plan — ${encounter?.title || 'Consultation'}`,
    plainLanguageSummary: note.diagnosis || note.chiefComplaint || 'The clinician-approved visit note is available for review.',
    findings: [note.chiefComplaint, note.examination, note.diagnosis].filter(Boolean),
    changesToday: [],
    medicines: (note.prescriptions || []).map(normalizeMedicine),
    testsToComplete: [],
    foodsOrActivitiesToAvoid: [],
    warningSigns: [],
    nextAppointment: note.followUp || 'Not documented',
    questionsAsked: [],
    clinicianNote: note.followUp || '',
    language: targetLanguage,
    generatedWith: 'local clinician-note formatter',
    aiDisclosure: '',
    patientName: patient.name,
  }
}

function sanitizePlan(plan = {}, targetLanguage = 'English') {
  return {
    title: String(plan.title || 'After-visit plan').slice(0, 500),
    plainLanguageSummary: String(plan.plainLanguageSummary || '').slice(0, 10000),
    findings: Array.isArray(plan.findings) ? plan.findings.map(String).slice(0, 30) : [],
    changesToday: Array.isArray(plan.changesToday) ? plan.changesToday.map(String).slice(0, 30) : [],
    medicines: Array.isArray(plan.medicines) ? plan.medicines.map(normalizeMedicine).slice(0, 30) : [],
    testsToComplete: Array.isArray(plan.testsToComplete) ? plan.testsToComplete.map(String).slice(0, 30) : [],
    foodsOrActivitiesToAvoid: Array.isArray(plan.foodsOrActivitiesToAvoid) ? plan.foodsOrActivitiesToAvoid.map(String).slice(0, 30) : [],
    warningSigns: Array.isArray(plan.warningSigns) ? plan.warningSigns.map(String).slice(0, 30) : [],
    nextAppointment: String(plan.nextAppointment || 'Not documented').slice(0, 2000),
    questionsAsked: Array.isArray(plan.questionsAsked) ? plan.questionsAsked.map(String).slice(0, 30) : [],
    clinicianNote: String(plan.clinicianNote || '').slice(0, 10000),
    language: String(targetLanguage || plan.language || 'English').slice(0, 80),
  }
}

async function createDraft({ uid, patient, encounter, targetLanguage = 'English' }) {
  const local = localAfterVisitPlan(patient, encounter, targetLanguage)
  const settings = await settingsFor(uid)
  if (!settings.apiKey || !settings.useForClinicalAI) return local
  try {
    const generated = await draftAfterVisitPlan({
      apiKey: settings.apiKey,
      model: settings.model || DEFAULT_CLINICAL_MODEL,
      patient,
      encounter,
      targetLanguage,
    })
    return {
      ...sanitizePlan(generated, targetLanguage),
      generatedWith: 'OpenAI structured after-visit draft',
      aiDisclosure: 'Drafted with OpenAI from the clinician-approved visit note. Clinician approval is required before delivery.',
      patientName: patient.name,
    }
  } catch (error) {
    console.error('[after-visit draft]', error.message)
    return { ...local, generationWarning: `OpenAI draft was unavailable: ${error.message}` }
  }
}

async function translatePlan({ uid, patient, plan, targetLanguage }) {
  const settings = await settingsFor(uid)
  if (!settings.apiKey || !settings.useForClinicalAI) throw new Error('Enable clinical intelligence in Settings > AI before translating a plan.')
  const translated = await translateAfterVisitPlan({
    apiKey: settings.apiKey,
    model: settings.model || DEFAULT_CLINICAL_MODEL,
    patient,
    plan: sanitizePlan(plan, plan.language),
    targetLanguage,
  })
  return {
    ...sanitizePlan(translated, targetLanguage),
    generatedWith: 'OpenAI structured translation',
    aiDisclosure: 'Translated with OpenAI. A clinician must review this version before delivery.',
    translatedFromPlanId: plan.id,
    patientName: patient.name,
  }
}

function planNarration(plan) {
  const medicines = (plan.medicines || []).map((item) => `${item.name}. ${item.dose}. ${item.timing}. ${item.duration}. ${item.instructions}`).join(' ')
  return [
    plan.plainLanguageSummary,
    plan.findings?.length ? `What the clinician found. ${plan.findings.join('. ')}` : '',
    plan.changesToday?.length ? `What changed today. ${plan.changesToday.join('. ')}` : '',
    medicines ? `Medicines. ${medicines}` : '',
    plan.testsToComplete?.length ? `Tests to complete. ${plan.testsToComplete.join('. ')}` : '',
    plan.foodsOrActivitiesToAvoid?.length ? `Foods or activities to avoid. ${plan.foodsOrActivitiesToAvoid.join('. ')}` : '',
    plan.warningSigns?.length ? `Get medical help for these warning signs. ${plan.warningSigns.join('. ')}` : '',
    plan.nextAppointment ? `Next appointment. ${plan.nextAppointment}` : '',
  ].filter(Boolean).join('\n\n').slice(0, 4000)
}

async function generatePlanAudio({ uid, patientId, planId, plan }) {
  const settings = await settingsFor(uid)
  if (!settings.apiKey) throw new Error('Add an OpenAI API key in Settings > AI before generating audio.')
  const client = clientFor(settings.apiKey)
  const response = await client.audio.speech.create({
    model: 'gpt-4o-mini-tts',
    voice: 'marin',
    input: planNarration(plan),
    instructions: `Speak clearly and calmly for a patient in ${plan.language || 'English'}. Preserve medicine names, doses, numbers, and warning signs.`,
  })
  const bytes = Buffer.from(await response.arrayBuffer())
  const localFile = await files.storeBase64({
    patientId,
    fileName: `after-visit-${planId}-${Date.now()}.mp3`,
    fileData: bytes.toString('base64'),
  })
  return {
    ...localFile,
    mimeType: 'audio/mpeg',
    generatedAt: now(),
    disclosure: 'This audio uses an AI-generated voice.',
  }
}

module.exports = { createDraft, translatePlan, generatePlanAudio, sanitizePlan }
