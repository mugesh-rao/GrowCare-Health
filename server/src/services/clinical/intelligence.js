const fs = require('fs')
const OpenAI = require('openai')
const store = require('../core/store')
const files = require('./files')

const MAX_TEXT = 180000

const extractionSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    documentDate: { type: 'string' },
    sourceType: { type: 'string' },
    diagnoses: { type: 'array', items: { type: 'string' } },
    medications: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, dose: { type: 'string' }, frequency: { type: 'string' }, status: { type: 'string' } }, required: ['name', 'dose', 'frequency', 'status'] } },
    allergies: { type: 'array', items: { type: 'string' } },
    observations: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, value: { type: 'string' }, unit: { type: 'string' }, status: { type: 'string' }, referenceRange: { type: 'string' } }, required: ['name', 'value', 'unit', 'status', 'referenceRange'] } },
    careGaps: { type: 'array', items: { type: 'string' } },
    clinicianQuestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'documentDate', 'sourceType', 'diagnoses', 'medications', 'allergies', 'observations', 'careGaps', 'clinicianQuestions'],
}

const contextSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    summary: { type: 'string' }, activeProblems: { type: 'array', items: { type: 'string' } },
    medications: { type: 'array', items: { type: 'string' } }, allergies: { type: 'array', items: { type: 'string' } },
    careGaps: { type: 'array', items: { type: 'string' } }, questionsForClinician: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'activeProblems', 'medications', 'allergies', 'careGaps', 'questionsForClinician'],
}

async function settingsFor(uid) {
  const user = await store.getDoc(`users/${uid}`)
  return user?.aiSettings || {}
}

function cleanJson(text) {
  try { return JSON.parse(String(text || '{}')) } catch { throw new Error('OpenAI returned an unreadable structured response.') }
}

async function responseJson(client, { model, input, schema, name }) {
  const response = await client.responses.create({
    model,
    input,
    text: { format: { type: 'json_schema', name, strict: true, schema } },
  })
  return cleanJson(response.output_text)
}

function clinicalInstructions(patient) {
  return `You are a clinical data extraction assistant. Extract only information explicitly present in the supplied source. Do not diagnose, infer, or give treatment advice. Return a draft for clinician review, not a medical decision. Patient reference: ${patient.name} (${patient.mrn || 'no MRN'}).`
}

async function createInputForArtifact(client, patient, artifact, filePath) {
  const mime = String(artifact.mimeType || '').toLowerCase()
  const name = artifact.fileName || 'clinical-source'
  if (mime.startsWith('audio/')) {
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(filePath), model: 'gpt-transcribe',
      prompt: `Clinical consultation for ${patient.name}. Preserve medication names, measurements and medical terminology.`,
    })
    return { sourceText: transcription.text || '', sourceMode: 'audio transcript' }
  }
  if (mime.startsWith('image/')) {
    const bytes = await fs.promises.readFile(filePath)
    return { sourceMode: 'image', content: [{ type: 'input_text', text: 'Extract the clinical data from this image.' }, { type: 'input_image', image_url: `data:${mime};base64,${bytes.toString('base64')}` }] }
  }
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) {
    const bytes = await fs.promises.readFile(filePath)
    return { sourceMode: 'PDF', content: [{ type: 'input_text', text: 'Extract the clinical data from this PDF. Preserve uncertainty.' }, { type: 'input_file', filename: name, file_data: `data:application/pdf;base64,${bytes.toString('base64')}`, detail: 'high' }] }
  }
  const sourceText = artifact.sourceText || (await fs.promises.readFile(filePath, 'utf8')).slice(0, MAX_TEXT)
  return { sourceText, sourceMode: 'document text' }
}

async function processArtifact({ uid, patient, artifact }) {
  const settings = await settingsFor(uid)
  if (!settings.apiKey) throw new Error('Add an OpenAI API key in Settings > AI before processing clinical sources.')
  if (!settings.useForClinicalAI) throw new Error('Enable clinical intelligence in Settings > AI before processing clinical sources.')
  const client = new OpenAI({ apiKey: settings.apiKey })
  const model = settings.model || 'gpt-4o'
  const filePath = await files.absoluteArtifactPath(patient.id, artifact)
  if (!filePath) throw new Error('This legacy source has no local file to process. Upload it again to use clinical intelligence.')
  const source = await createInputForArtifact(client, patient, artifact, filePath)
  const content = source.content || [{ type: 'input_text', text: `Source text:\n${String(source.sourceText || '').slice(0, MAX_TEXT)}` }]
  const extracted = await responseJson(client, {
    model, name: 'clinical_source_extraction', schema: extractionSchema,
    input: [{ role: 'system', content: clinicalInstructions(patient) }, { role: 'user', content }],
  })
  return { extracted, sourceText: source.sourceText || '', sourceMode: source.sourceMode }
}

async function buildContext({ uid, patient, extractions, observations = [], encounters = [] }) {
  const settings = await settingsFor(uid)
  const local = {
    summary: `${extractions.length} processed clinical source${extractions.length === 1 ? '' : 's'} and ${observations.length} recorded observation${observations.length === 1 ? '' : 's'} are available for review.`,
    activeProblems: [...new Set(extractions.flatMap((item) => item.data?.diagnoses || []))].slice(0, 12),
    medications: [...new Set(extractions.flatMap((item) => (item.data?.medications || []).map((medication) => `${medication.name}${medication.dose ? ` ${medication.dose}` : ''}`)))].slice(0, 20),
    allergies: [...new Set(extractions.flatMap((item) => item.data?.allergies || []))].slice(0, 12),
    careGaps: [...new Set(extractions.flatMap((item) => item.data?.careGaps || []))].slice(0, 12),
    questionsForClinician: [...new Set(extractions.flatMap((item) => item.data?.clinicianQuestions || []))].slice(0, 12),
  }
  if (!settings.apiKey || !settings.useForClinicalAI || !extractions.length) return { data: local, generatedWith: 'local aggregation' }
  const client = new OpenAI({ apiKey: settings.apiKey })
  const data = await responseJson(client, {
    model: settings.model || 'gpt-4o', name: 'patient_clinical_context', schema: contextSchema,
    input: [{ role: 'system', content: 'Create a concise longitudinal clinical context from confirmed extracted data. Do not invent facts, diagnose, or prescribe. This is a clinician-review draft.' }, { role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ patient: { name: patient.name, mrn: patient.mrn }, extractedSources: extractions.map(({ artifactId, data }) => ({ artifactId, ...data })), observations, encounters: encounters.map((item) => item.note || {}) }).slice(0, MAX_TEXT) }] }],
  })
  return { data, generatedWith: 'OpenAI clinical context draft' }
}

async function askRecord({ uid, patient, context, sources, question }) {
  const settings = await settingsFor(uid)
  if (!settings.apiKey || !settings.useForClinicalAI) return null
  const client = new OpenAI({ apiKey: settings.apiKey })
  const response = await client.responses.create({
    model: settings.model || 'gpt-4o',
    input: [{ role: 'system', content: 'Answer strictly from the supplied local patient context and source list. State when the record lacks evidence. Never diagnose or prescribe. End with: "Clinician review required."' }, { role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ patient: { name: patient.name, mrn: patient.mrn }, context, sources, question }).slice(0, MAX_TEXT) }] }],
  })
  return String(response.output_text || '').trim() || null
}

module.exports = { processArtifact, buildContext, askRecord }
