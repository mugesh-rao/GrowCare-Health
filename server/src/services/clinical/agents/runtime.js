const OpenAI = require('openai')
const { Agent, Runner, setDefaultOpenAIClient, setOpenAIAPI } = require('@openai/agents')

const DEFAULT_CLINICAL_MODEL = 'gpt-5.6-luna'

function clientFor(apiKey) {
  const client = new OpenAI({ apiKey })
  // This local desktop server is single-user. The SDK uses this client for the
  // current agent run, while audio/file endpoints use the same instance directly.
  setDefaultOpenAIClient(client)
  setOpenAIAPI('responses')
  return client
}

async function runStructuredAgent({ apiKey, model, name, instructions, outputType, input }) {
  clientFor(apiKey)
  const agent = new Agent({
    name,
    model: model || DEFAULT_CLINICAL_MODEL,
    instructions,
    outputType,
    modelSettings: { reasoning: { effort: 'medium' } },
  })
  // Clinical prompts and outputs must not be exported as SDK traces.
  const runner = new Runner({ tracingDisabled: true, traceIncludeSensitiveData: false })
  const result = await runner.run(agent, input, { maxTurns: 1 })
  if (result.finalOutput == null) throw new Error(`${name} did not return an output.`)
  if (typeof result.finalOutput === 'string') return JSON.parse(result.finalOutput)
  return result.finalOutput
}

async function runTextAgent({ apiKey, model, name, instructions, input }) {
  clientFor(apiKey)
  const agent = new Agent({ name, model: model || DEFAULT_CLINICAL_MODEL, instructions, modelSettings: { reasoning: { effort: 'medium' } } })
  const runner = new Runner({ tracingDisabled: true, traceIncludeSensitiveData: false })
  const result = await runner.run(agent, input, { maxTurns: 1 })
  return String(result.finalOutput || '').trim()
}

module.exports = { DEFAULT_CLINICAL_MODEL, clientFor, runStructuredAgent, runTextAgent }
