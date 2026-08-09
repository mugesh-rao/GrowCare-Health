const { runTextAgent } = require('./runtime')

function answerRecordQuestion({ apiKey, model, record }) {
  return runTextAgent({
    apiKey, model, name: 'Grounded patient record agent',
    instructions: 'Answer strictly from the local patient context and extracted source list supplied by the application. State when the record does not contain evidence. Never diagnose or prescribe. End every response with: "Clinician review required."',
    input: JSON.stringify(record).slice(0, 180000),
  })
}

module.exports = { answerRecordQuestion }
