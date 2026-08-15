const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'growcare-clinical-rag-'))
process.env.APP_DATA_DIR = dataDir
let store

async function run() {
  store = require('../src/services/core/store')
  const secureSettings = require('../src/services/core/secureSettings')
  const rag = require('../src/services/clinical/rag')

  await secureSettings.saveAISettings('test-owner', {
    apiKey: 'test-openai-key-not-for-network',
    model: 'gpt-5.6-luna',
    embeddingModel: 'text-embedding-3-small',
    useForClinicalAI: false,
  })
  const rawUser = await store.getDoc('users/test-owner')
  assert.equal(rawUser.aiSettings.apiKey, undefined, 'SQLite document must not retain a plaintext API key')
  assert.match(rawUser.aiSettings.apiKeyCipher, /^v1\./, 'API key must use the encrypted vault format')
  assert.equal((await secureSettings.readAISettings('test-owner')).apiKey, 'test-openai-key-not-for-network')

  const indexed = await rag.indexSource({
    uid: 'test-owner', patientId: 'patient-1', artifactId: 'report-1',
    sourceType: 'laboratory report', sourceLabel: 'Metabolic panel',
    text: 'HbA1c is 8.4 percent. Creatinine is 1.8 mg/dL. Renal follow-up is recommended.',
  })
  assert.equal(indexed.chunks, 1)
  assert.equal(indexed.embeddedChunks, 0, 'No embedding network call is allowed while clinical AI is disabled')

  const retrieved = await rag.retrieve({ uid: 'test-owner', patientId: 'patient-1', question: 'What are the HbA1c and creatinine values?' })
  assert.equal(retrieved.mode, 'local lexical search')
  assert.equal(retrieved.chunks.length, 1)
  assert.equal(retrieved.chunks[0].citation, 'S1')
  assert.match(retrieved.chunks[0].excerpt, /HbA1c is 8.4/i)
  assert.equal(rag.stats({ uid: 'test-owner', patientId: 'patient-1' }).chunks, 1)

  console.log('Clinical RAG integration test passed.')
}

run()
  .catch((error) => { console.error(error); process.exitCode = 1 })
  .finally(() => {
    try { store?.close() } catch {}
    fs.rmSync(dataDir, { recursive: true, force: true })
  })
