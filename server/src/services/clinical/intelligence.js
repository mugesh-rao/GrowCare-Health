const fs = require('fs')
const os = require('os')
const path = require('path')
const store = require('../core/store')
const secureSettings = require('../core/secureSettings')
const files = require('./files')
const { DEFAULT_CLINICAL_MODEL, clientFor } = require('./agents/runtime')
const { extractClinicalSource } = require('./agents/extractionAgent')
const { buildClinicalContext } = require('./agents/contextAgent')
const { answerRecordQuestion } = require('./agents/recordChatAgent')
const { draftScribeNote } = require('./agents/scribeAgent')

const MAX_TEXT = 180000

async function settingsFor(uid) {
  return secureSettings.readAISettings(uid)
}

async function createInputForArtifact(client, patient, artifact, filePath, model) {
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
    const response = await client.responses.create({ model, input: [{ role: 'user', content: [{ type: 'input_text', text: 'Transcribe the visible clinical content faithfully. Preserve measurements, medication names, dates, and uncertainty. Do not summarize or diagnose.' }, { type: 'input_image', image_url: `data:${mime};base64,${bytes.toString('base64')}` }] }] })
    return { sourceText: response.output_text || '', sourceMode: 'image transcript' }
  }
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) {
    const bytes = await fs.promises.readFile(filePath)
    const response = await client.responses.create({ model, input: [{ role: 'user', content: [{ type: 'input_text', text: 'Transcribe the clinical content of this PDF faithfully. Preserve measurements, medication names, dates, tables, and uncertainty. Do not summarize or diagnose.' }, { type: 'input_file', filename: name, file_data: `data:application/pdf;base64,${bytes.toString('base64')}`, detail: 'high' }] }] })
    return { sourceText: response.output_text || '', sourceMode: 'PDF transcript' }
  }
  const sourceText = artifact.sourceText || (await fs.promises.readFile(filePath, 'utf8')).slice(0, MAX_TEXT)
  return { sourceText, sourceMode: 'document text' }
}

async function processArtifact({ uid, patient, artifact }) {
  const settings = await settingsFor(uid)
  if (!settings.apiKey) throw new Error('Add an OpenAI API key in Settings > AI before processing clinical sources.')
  if (!settings.useForClinicalAI) throw new Error('Enable clinical intelligence in Settings > AI before processing clinical sources.')
  const client = clientFor(settings.apiKey)
  const model = settings.model || DEFAULT_CLINICAL_MODEL
  const filePath = await files.absoluteArtifactPath(patient.id, artifact)
  if (!filePath) throw new Error('This legacy source has no local file to process. Upload it again to use clinical intelligence.')
  const source = await createInputForArtifact(client, patient, artifact, filePath, model)
  const extracted = await extractClinicalSource({ apiKey: settings.apiKey, model, patient, sourceText: source.sourceText, sourceMode: source.sourceMode })
  return { extracted, sourceText: source.sourceText || '', sourceMode: source.sourceMode }
}

async function buildContext({ uid, patient, extractions, observations = [], encounters = [], contextNote = '' }) {
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
  const data = await buildClinicalContext({ apiKey: settings.apiKey, model: settings.model || DEFAULT_CLINICAL_MODEL, record: { patient: { name: patient.name, mrn: patient.mrn }, clinicianContextNote: contextNote, extractedSources: extractions.map(({ artifactId, data }) => ({ artifactId, ...data })), observations, encounters: encounters.map((item) => item.note || {}) } })
  return { data, generatedWith: 'OpenAI clinical context draft' }
}

async function askRecord({ uid, patient, context, sources, question }) {
  const settings = await settingsFor(uid)
  if (!settings.apiKey || !settings.useForClinicalAI) return null
  return (await answerRecordQuestion({ apiKey: settings.apiKey, model: settings.model || DEFAULT_CLINICAL_MODEL, record: { patient: { name: patient.name, mrn: patient.mrn }, context, sources, question } })) || null
}

async function transcribeScribeAudio({ uid, patient, artifact }) {
  const settings = await settingsFor(uid)
  if (!settings.apiKey || !settings.useForScribing) return ''
  const localPath = await files.absoluteArtifactPath(patient.id, artifact)
  if (!localPath) return ''
  const client = clientFor(settings.apiKey)
  const result = await client.audio.transcriptions.create({
    file: fs.createReadStream(localPath), model: 'gpt-transcribe',
    prompt: `Clinical consultation for ${patient.name}. Preserve medication names, measurements, symptoms, and medical terminology.`,
  })
  return String(result.text || '').trim()
}

async function transcribeAudioChunk({ uid, audioData, mimeType = 'audio/webm' }) {
  const settings = await settingsFor(uid)
  if (!settings.apiKey || !settings.useForScribing) throw new Error('Enable scribe AI in Settings > AI before live transcription.')
  const raw = String(audioData || '')
  const encoded = raw.includes(',') ? raw.split(',').slice(1).join(',') : raw
  const bytes = Buffer.from(encoded, 'base64')
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error('Live audio chunk is invalid or too large.')
  const extension = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('wav') ? 'wav' : 'webm'
  const tempPath = path.join(os.tmpdir(), `growcare-scribe-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`)
  await fs.promises.writeFile(tempPath, bytes)
  try {
    const client = clientFor(settings.apiKey)
    const result = await client.audio.transcriptions.create({ file: fs.createReadStream(tempPath), model: 'gpt-transcribe' })
    return String(result.text || '').trim()
  } finally {
    await fs.promises.unlink(tempPath).catch(() => {})
  }
}

async function generateScribeDraft({ uid, patient, transcript }) {
  const settings = await settingsFor(uid)
  if (!settings.apiKey || !settings.useForScribing || !String(transcript || '').trim()) return null
  return draftScribeNote({ apiKey: settings.apiKey, model: settings.model || DEFAULT_CLINICAL_MODEL, patient, transcript })
}

module.exports = { processArtifact, buildContext, askRecord, transcribeScribeAudio, transcribeAudioChunk, generateScribeDraft }
