const crypto = require('crypto')
const store = require('../core/store')
const secureSettings = require('../core/secureSettings')
const { clientFor } = require('./agents/runtime')

const MAX_CHUNK_LENGTH = 1100
const CHUNK_OVERLAP = 180

function normalizeText(value) {
  return String(value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

function chunkText(value) {
  const text = normalizeText(value)
  const chunks = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(text.length, start + MAX_CHUNK_LENGTH)
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf('\n', end), text.lastIndexOf('. ', end), text.lastIndexOf(' ', end))
      if (boundary > start + 400) end = boundary + 1
    }
    const content = text.slice(start, end).trim()
    if (content) chunks.push({ content, startOffset: start, endOffset: end })
    if (end >= text.length) break
    start = Math.max(end - CHUNK_OVERLAP, start + 1)
  }
  return chunks
}

function hash(value) { return crypto.createHash('sha256').update(value).digest('hex') }

function vectorBuffer(values) {
  const out = Buffer.alloc(values.length * 4)
  values.forEach((value, index) => out.writeFloatLE(Number(value) || 0, index * 4))
  return out
}

function vectorValues(buffer) {
  if (!buffer || buffer.length % 4) return []
  const out = new Float32Array(buffer.length / 4)
  for (let index = 0; index < out.length; index += 1) out[index] = buffer.readFloatLE(index * 4)
  return out
}

function cosine(a, b) {
  if (!a.length || a.length !== b.length) return 0
  let dot = 0; let left = 0; let right = 0
  for (let index = 0; index < a.length; index += 1) { dot += a[index] * b[index]; left += a[index] ** 2; right += b[index] ** 2 }
  return left && right ? dot / Math.sqrt(left * right) : 0
}

function lexicalScore(content, question) {
  const words = new Set((String(question).toLowerCase().match(/[\p{L}\p{N}_-]{2,}/gu) || []).slice(0, 18))
  if (!words.size) return 0
  const lower = String(content).toLowerCase()
  let hits = 0
  words.forEach((word) => { if (lower.includes(word)) hits += 1 })
  return hits / words.size
}

async function indexSource({ uid, patientId, artifactId = null, encounterId = null, sourceType, sourceLabel, text }) {
  const pieces = chunkText(text).map((item, index) => ({
    ...item,
    index,
    id: crypto.randomUUID(),
    contentHash: hash(item.content),
  }))
  store.replaceRagChunks({ uid, patientId, artifactId, encounterId, sourceType, sourceLabel, chunks: pieces })
  const settings = await secureSettings.readAISettings(uid)
  if (!pieces.length || !settings.apiKey || !settings.useForClinicalAI) return { chunks: pieces.length, embeddedChunks: 0, mode: 'local lexical search' }
  try {
    const response = await clientFor(settings.apiKey).embeddings.create({
      model: settings.embeddingModel || 'text-embedding-3-small',
      input: pieces.map((piece) => piece.content),
      encoding_format: 'float',
    })
    const vectors = response.data || []
    store.putRagEmbeddings(vectors.map((item, index) => ({ chunkId: pieces[index].id, model: settings.embeddingModel || 'text-embedding-3-small', dimensions: item.embedding.length, vector: vectorBuffer(item.embedding) })))
    return { chunks: pieces.length, embeddedChunks: vectors.length, mode: 'hybrid local RAG' }
  } catch (error) {
    console.error('[clinical rag index]', error.message)
    return { chunks: pieces.length, embeddedChunks: 0, mode: 'local lexical search', warning: `Embeddings were not created: ${error.message}` }
  }
}

async function retrieve({ uid, patientId, question, limit = 6 }) {
  const candidates = store.listRagChunks({ uid, patientId, query: question, limit: 320 })
  if (!candidates.length) return { chunks: [], mode: 'empty' }
  const settings = await secureSettings.readAISettings(uid)
  let questionVector = []
  let mode = 'local lexical search'
  if (settings.apiKey && settings.useForClinicalAI && candidates.some((item) => item.vector)) {
    try {
      const response = await clientFor(settings.apiKey).embeddings.create({ model: settings.embeddingModel || 'text-embedding-3-small', input: String(question).slice(0, 6000), encoding_format: 'float' })
      questionVector = response.data?.[0]?.embedding || []
      mode = 'hybrid local RAG'
    } catch (error) { console.error('[clinical rag retrieve]', error.message) }
  }
  const ranked = candidates.map((item) => {
    const lexical = lexicalScore(item.content, question)
    const semantic = questionVector.length ? cosine(questionVector, vectorValues(item.vector)) : 0
    return { ...item, score: questionVector.length ? (semantic * 0.78) + (lexical * 0.22) : lexical }
  }).sort((a, b) => b.score - a.score).slice(0, limit)
  return {
    mode,
    chunks: ranked.map((item, index) => ({
      id: item.id, citation: `S${index + 1}`, sourceLabel: item.source_label, sourceType: item.source_type,
      artifactId: item.artifact_id, encounterId: item.encounter_id, startOffset: item.start_offset,
      excerpt: item.content.slice(0, 1200), score: Number(item.score.toFixed(3)),
    })),
  }
}

function stats({ uid, patientId }) { return store.ragStats({ uid, patientId }) }

module.exports = { indexSource, retrieve, stats, chunkText }
