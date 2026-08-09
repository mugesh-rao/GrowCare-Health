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
`)

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
}
