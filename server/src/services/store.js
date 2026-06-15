/**
 * store — a tiny document database abstraction over Firestore paths.
 *
 * Backends:
 *   - Firestore (when Firebase Admin is configured) → production
 *   - File store under server/.data (local dev, no credentials needed)
 *
 * Path semantics mirror Firestore: an EVEN number of segments addresses a
 * document ("users/uid"), an ODD number addresses a collection ("users/uid/flows").
 */
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const { db, firebaseEnabled } = require('../config/firebase')

const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

/* ----------------------------- Firestore backend ----------------------------- */
const firestoreBackend = {
  async getDoc(p) {
    const snap = await db.doc(p).get()
    return snap.exists ? { id: snap.id, ...snap.data() } : null
  },
  async setDoc(p, data, merge = true) {
    await db.doc(p).set(data, { merge })
  },
  async updateDoc(p, data) {
    await db.doc(p).set(data, { merge: true })
  },
  async deleteDoc(p) {
    await db.doc(p).delete()
  },
  async listDocs(colPath, filters = []) {
    let q = db.collection(colPath)
    for (const [field, op, value] of filters) q = q.where(field, op, value)
    const snap = await q.get()
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  },
  async countDocs(colPath, filters = []) {
    let q = db.collection(colPath)
    for (const [field, op, value] of filters) q = q.where(field, op, value)
    const snap = await q.count().get()
    return snap.data().count
  },
}

/* ------------------------------- File backend -------------------------------- */
const DATA_DIR = path.join(process.cwd(), '.data')

const fileForDoc = (p) => path.join(DATA_DIR, ...p.split('/')) + '.json'
const dirForCol = (p) => path.join(DATA_DIR, ...p.split('/'))

const fileBackend = {
  async getDoc(p) {
    try {
      const raw = await fsp.readFile(fileForDoc(p), 'utf8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  },
  async setDoc(p, data, merge = true) {
    const file = fileForDoc(p)
    await fsp.mkdir(path.dirname(file), { recursive: true })
    let next = data
    if (merge) {
      const existing = (await this.getDoc(p)) || {}
      next = { ...existing, ...data }
    }
    const id = p.split('/').pop()
    await fsp.writeFile(file, JSON.stringify({ id, ...next }, null, 2))
  },
  async updateDoc(p, data) {
    await this.setDoc(p, data, true)
  },
  async deleteDoc(p) {
    try {
      await fsp.unlink(fileForDoc(p))
    } catch {
      /* already gone */
    }
  },
  async listDocs(colPath, filters = []) {
    const dir = dirForCol(colPath)
    let files = []
    try {
      files = (await fsp.readdir(dir)).filter((f) => f.endsWith('.json'))
    } catch {
      return []
    }
    let docs = await Promise.all(
      files.map((f) =>
        fsp
          .readFile(path.join(dir, f), 'utf8')
          .then(JSON.parse)
          .catch(() => null),
      ),
    )
    docs = docs.filter(Boolean)
    for (const [field, op, value] of filters) {
      docs = docs.filter((d) => {
        if (op === '==') return d[field] === value
        if (op === '!=') return d[field] !== value
        return true
      })
    }
    return docs
  },
  async countDocs(colPath, filters = []) {
    return (await this.listDocs(colPath, filters)).length
  },
}

if (!firebaseEnabled && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

/**
 * listAllSessions — enumerate every session across all users (for boot
 * reconnect). Returns [{ uid, sessionId, ...data }].
 */
async function listAllSessions() {
  if (firebaseEnabled) {
    const snap = await db.collectionGroup('sessions').get()
    return snap.docs.map((d) => ({
      uid: d.ref.parent.parent.id,
      sessionId: d.id,
      ...d.data(),
    }))
  }
  // File backend: walk .data/users/<uid>/sessions/*.json
  const usersDir = path.join(DATA_DIR, 'users')
  const out = []
  let uids = []
  try {
    uids = await fsp.readdir(usersDir)
  } catch {
    return out
  }
  for (const uid of uids) {
    const sessionsDir = path.join(usersDir, uid, 'sessions')
    let files = []
    try {
      files = (await fsp.readdir(sessionsDir)).filter((f) => f.endsWith('.json'))
    } catch {
      continue
    }
    for (const f of files) {
      try {
        const data = JSON.parse(
          await fsp.readFile(path.join(sessionsDir, f), 'utf8'),
        )
        out.push({ uid, sessionId: f.replace(/\.json$/, ''), ...data })
      } catch {
        /* skip */
      }
    }
  }
  return out
}

/**
 * listAllScheduled — enumerate pending scheduled messages across all users
 * (for the scheduler worker). Returns [{ uid, id, ...data }].
 */
async function listAllScheduled() {
  if (firebaseEnabled) {
    const snap = await db
      .collectionGroup('scheduled')
      .where('status', '==', 'pending')
      .get()
    return snap.docs.map((d) => ({
      uid: d.ref.parent.parent.id,
      id: d.id,
      ...d.data(),
    }))
  }
  const usersDir = path.join(DATA_DIR, 'users')
  const out = []
  let uids = []
  try {
    uids = await fsp.readdir(usersDir)
  } catch {
    return out
  }
  for (const uid of uids) {
    const dir = path.join(usersDir, uid, 'scheduled')
    let files = []
    try {
      files = (await fsp.readdir(dir)).filter((f) => f.endsWith('.json'))
    } catch {
      continue
    }
    for (const f of files) {
      try {
        const data = JSON.parse(await fsp.readFile(path.join(dir, f), 'utf8'))
        if (data.status === 'pending') out.push({ uid, id: f.replace(/\.json$/, ''), ...data })
      } catch {
        /* skip */
      }
    }
  }
  return out
}

const backend = firebaseEnabled ? firestoreBackend : fileBackend

module.exports = {
  genId,
  getDoc: (p) => backend.getDoc(p),
  setDoc: (p, data, merge) => backend.setDoc(p, data, merge),
  updateDoc: (p, data) => backend.updateDoc(p, data),
  deleteDoc: (p) => backend.deleteDoc(p),
  listDocs: (p, filters) => backend.listDocs(p, filters),
  countDocs: (p, filters) => backend.countDocs(p, filters),
  listAllSessions,
  listAllScheduled,
}
