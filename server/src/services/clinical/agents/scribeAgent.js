const { runStructuredAgent } = require('./runtime')

const noteSchema = {
  type: 'json_schema', name: 'clinical_scribe_draft', strict: true,
  schema: { type: 'object', additionalProperties: false, properties: {
    chiefComplaint: { type: 'string' }, examination: { type: 'string' }, diagnosis: { type: 'string' }, followUp: { type: 'string' },
    prescriptions: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { drug: { type: 'string' }, dose: { type: 'string' }, frequency: { type: 'string' }, route: { type: 'string' }, duration: { type: 'string' } }, required: ['drug', 'dose', 'frequency', 'route', 'duration'] } },
  }, required: ['chiefComplaint', 'examination', 'diagnosis', 'followUp', 'prescriptions'] },
}

function draftScribeNote({ apiKey, model, patient, transcript }) {
  return runStructuredAgent({
    apiKey, model, name: 'Clinical scribe agent', outputType: noteSchema,
    instructions: 'Create a concise clinician-review visit draft from the transcript. Include only facts in the transcript. Do not invent findings, medication, diagnosis, or advice. Use empty strings/arrays when uncertain.',
    input: JSON.stringify({ patient: { name: patient.name, specialty: patient.specialty, condition: patient.condition }, transcript: String(transcript || '').slice(0, 180000) }),
  })
}

module.exports = { draftScribeNote }
