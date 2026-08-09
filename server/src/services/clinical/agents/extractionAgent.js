const { runStructuredAgent } = require('./runtime')
const { extraction } = require('./schemas')

function extractClinicalSource({ apiKey, model, patient, sourceText, sourceMode }) {
  return runStructuredAgent({
    apiKey, model, name: 'Clinical extraction agent', outputType: extraction,
    instructions: `You extract clinical facts only from the supplied ${sourceMode}. Do not infer, diagnose, prescribe, or fill gaps. This is a draft requiring clinician review. Patient reference: ${patient.name} (${patient.mrn || 'no MRN'}).`,
    input: `Clinical source:\n${String(sourceText || '').slice(0, 180000)}`,
  })
}

module.exports = { extractClinicalSource }
