/**
 * Local document storage backed by one SQLite database.
 *
 * The route layer keeps its original document-path API (for example,
 * `users/local-owner/flows/abc`). SQLite stores JSON documents with their path
 * metadata, giving the desktop app a transactional, portable local database.
 */
const fs = require('fs')
const path = require('path')
const { DatabaseSync } = require('node:sqlite')

const DATA_DIR = process.env.APP_DATA_DIR || path.join(process.cwd(), '.data')
fs.mkdirSync(DATA_DIR, { recursive: true })

const database = new DatabaseSync(path.join(DATA_DIR, 'growcare.sqlite3'))
database.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS documents (
    path TEXT PRIMARY KEY,
    collection_path TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS documents_collection_path ON documents(collection_path);

  CREATE TABLE IF NOT EXISTS rag_chunks (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    artifact_id TEXT,
    encounter_id TEXT,
    source_type TEXT NOT NULL,
    source_label TEXT NOT NULL,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    content_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS rag_chunks_patient ON rag_chunks(uid, patient_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS rag_chunks_source ON rag_chunks(uid, patient_id, artifact_id, encounter_id);
  CREATE TABLE IF NOT EXISTS rag_embeddings (
    chunk_id TEXT PRIMARY KEY REFERENCES rag_chunks(id) ON DELETE CASCADE,
    model TEXT NOT NULL,
    dimensions INTEGER NOT NULL,
    vector BLOB NOT NULL,
    created_at INTEGER NOT NULL
  );
`)

// FTS5 is shipped with standard Node SQLite builds.  Keep a LIKE fallback for
// unusually stripped-down runtime builds so a clinic never loses local search.
let ftsAvailable = true
try {
  database.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS rag_fts USING fts5(chunk_id UNINDEXED, uid UNINDEXED, patient_id UNINDEXED, content);`)
} catch {
  ftsAvailable = false
}

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
const collectionForDoc = (docPath) => docPath.split('/').slice(0, -1).join('/')
const idForDoc = (docPath) => docPath.split('/').at(-1)
const parseDoc = (row) => (row ? { id: row.id, ...JSON.parse(row.data) } : null)

function docsInCollection(collectionPath) {
  return database
    .prepare('SELECT id, data FROM documents WHERE collection_path = ?')
    .all(collectionPath)
    .map(parseDoc)
}

const sqlite = {
  async getDoc(docPath) {
    return parseDoc(database.prepare('SELECT id, data FROM documents WHERE path = ?').get(docPath))
  },

  async setDoc(docPath, data, merge = true) {
    const existing = merge ? await this.getDoc(docPath) : null
    const next = merge ? { ...(existing || {}), ...data } : { ...data }
    delete next.id
    database
      .prepare(`INSERT INTO documents (path, collection_path, id, data) VALUES (?, ?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
          collection_path = excluded.collection_path,
          id = excluded.id,
          data = excluded.data`)
      .run(docPath, collectionForDoc(docPath), idForDoc(docPath), JSON.stringify(next))
  },

  async updateDoc(docPath, data) {
    await this.setDoc(docPath, data, true)
  },

  async deleteDoc(docPath) {
    database.prepare('DELETE FROM documents WHERE path = ?').run(docPath)
  },

  async deletePathAndDescendants(docPath) {
    database.prepare('DELETE FROM documents WHERE path = ? OR path LIKE ?').run(docPath, `${docPath}/%`)
  },

  async listDocs(collectionPath, filters = []) {
    let documents = docsInCollection(collectionPath)
    for (const [field, operator, value] of filters) {
      documents = documents.filter((document) => {
        if (operator === '==') return document[field] === value
        if (operator === '!=') return document[field] !== value
        return true
      })
    }
    return documents
  },

  async countDocs(collectionPath, filters = []) {
    return (await this.listDocs(collectionPath, filters)).length
  },
}

async function listAllSessions() {
  return database
    .prepare("SELECT path, id, data FROM documents WHERE collection_path LIKE 'users/%/sessions'")
    .all()
    .map((row) => ({ uid: row.path.split('/')[1], sessionId: row.id, ...JSON.parse(row.data) }))
}

async function listAllScheduled() {
  return database
    .prepare("SELECT path, id, data FROM documents WHERE collection_path LIKE 'users/%/scheduled'")
    .all()
    .map((row) => ({ uid: row.path.split('/')[1], id: row.id, ...JSON.parse(row.data) }))
    .filter((scheduled) => scheduled.status === 'pending')
}

function replaceRagChunks({ uid, patientId, artifactId = null, encounterId = null, sourceType, sourceLabel, chunks }) {
  const sourceColumn = artifactId ? 'artifact_id' : 'encounter_id'
  const sourceId = artifactId || encounterId
  if (!sourceId) throw new Error('A RAG source must be linked to an artifact or encounter.')
  const prior = database.prepare(`SELECT id FROM rag_chunks WHERE uid = ? AND patient_id = ? AND ${sourceColumn} = ?`).all(uid, patientId, sourceId)
  const remove = database.prepare('DELETE FROM rag_chunks WHERE id = ?')
  const removeEmbedding = database.prepare('DELETE FROM rag_embeddings WHERE chunk_id = ?')
  const removeFts = ftsAvailable ? database.prepare('DELETE FROM rag_fts WHERE chunk_id = ?') : null
  const add = database.prepare(`INSERT INTO rag_chunks (id, uid, patient_id, artifact_id, encounter_id, source_type, source_label, content, chunk_index, start_offset, end_offset, content_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const addFts = ftsAvailable ? database.prepare('INSERT INTO rag_fts (chunk_id, uid, patient_id, content) VALUES (?, ?, ?, ?)') : null
  database.exec('BEGIN IMMEDIATE')
  try {
    prior.forEach((row) => { removeEmbedding.run(row.id); if (removeFts) removeFts.run(row.id); remove.run(row.id) })
    chunks.forEach((chunk) => {
      add.run(chunk.id, uid, patientId, artifactId, encounterId, sourceType, sourceLabel, chunk.content, chunk.index, chunk.startOffset, chunk.endOffset, chunk.contentHash, Date.now())
      if (addFts) addFts.run(chunk.id, uid, patientId, chunk.content)
    })
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

function putRagEmbeddings(rows) {
  const put = database.prepare(`INSERT INTO rag_embeddings (chunk_id, model, dimensions, vector, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(chunk_id) DO UPDATE SET model = excluded.model, dimensions = excluded.dimensions, vector = excluded.vector, created_at = excluded.created_at`)
  database.exec('BEGIN IMMEDIATE')
  try {
    rows.forEach((row) => put.run(row.chunkId, row.model, row.dimensions, row.vector, Date.now()))
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

function listRagChunks({ uid, patientId, query = '', limit = 240 }) {
  const normalized = String(query).trim().toLowerCase()
  let rows
  if (normalized && ftsAvailable) {
    const terms = normalized.match(/[\p{L}\p{N}_-]{2,}/gu)?.slice(0, 12) || []
    const match = terms.map((term) => `"${term.replace(/"/g, '')}"`).join(' OR ')
    try {
      rows = database.prepare(`SELECT c.*, e.model, e.dimensions, e.vector FROM rag_fts f JOIN rag_chunks c ON c.id = f.chunk_id LEFT JOIN rag_embeddings e ON e.chunk_id = c.id WHERE f.uid = ? AND f.patient_id = ? AND rag_fts MATCH ? LIMIT ?`).all(uid, patientId, match, limit)
    } catch { rows = null }
  }
  if (!rows || !rows.length) {
    rows = database.prepare(`SELECT c.*, e.model, e.dimensions, e.vector FROM rag_chunks c LEFT JOIN rag_embeddings e ON e.chunk_id = c.id WHERE c.uid = ? AND c.patient_id = ? ORDER BY c.created_at DESC LIMIT ?`).all(uid, patientId, limit)
  }
  return rows.map((row) => ({ ...row, vector: row.vector ? Buffer.from(row.vector) : null }))
}

function ragStats({ uid, patientId }) {
  return database.prepare(`SELECT COUNT(*) AS chunks, SUM(CASE WHEN e.chunk_id IS NOT NULL THEN 1 ELSE 0 END) AS embeddedChunks, MAX(c.created_at) AS indexedAt FROM rag_chunks c LEFT JOIN rag_embeddings e ON e.chunk_id = c.id WHERE c.uid = ? AND c.patient_id = ?`).get(uid, patientId) || { chunks: 0, embeddedChunks: 0, indexedAt: null }
}

module.exports = {
  genId,
  getDoc: (path) => sqlite.getDoc(path),
  setDoc: (path, data, merge) => sqlite.setDoc(path, data, merge),
  updateDoc: (path, data) => sqlite.updateDoc(path, data),
  deleteDoc: (path) => sqlite.deleteDoc(path),
  deletePathAndDescendants: (path) => sqlite.deletePathAndDescendants(path),
  listDocs: (path, filters) => sqlite.listDocs(path, filters),
  countDocs: (path, filters) => sqlite.countDocs(path, filters),
  listAllSessions,
  listAllScheduled,
  close: () => database.close(),
  replaceRagChunks,
  putRagEmbeddings,
  listRagChunks,
  ragStats,
}
