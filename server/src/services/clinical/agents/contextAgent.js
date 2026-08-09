const { runStructuredAgent } = require('./runtime')
const { context } = require('./schemas')

function buildClinicalContext({ apiKey, model, record }) {
  return runStructuredAgent({
    apiKey, model, name: 'Clinical context agent', outputType: context,
    instructions: 'Create a concise longitudinal clinical context strictly from the supplied extracted data. Do not invent facts, diagnose, or prescribe. The result is a clinician-review draft.',
    input: JSON.stringify(record).slice(0, 180000),
  })
}

module.exports = { buildClinicalContext }
