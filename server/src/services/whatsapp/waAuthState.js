/**
 * waAuthState — a Baileys AuthenticationState backed by our `store`
 * (Firestore in production, file store in dev).
 *
 * Persistence model (per PRD §6):
 *   users/{uid}/sessions/{sessionId}            → field `creds` (serialized)
 *   users/{uid}/sessions/{sessionId}/authKeys/* → one doc per signal key
 *
 * Values are serialized with Baileys' BufferJSON so Buffers survive JSON
 * storage in either backend.
 */
const store = require('../core/store')

async function useStoreAuthState(baileys, uid, sessionId) {
  const { initAuthCreds, BufferJSON, proto } = baileys

  const sessionPath = `users/${uid}/sessions/${sessionId}`
  const keysCol = `${sessionPath}/authKeys`

  const serialize = (v) => JSON.stringify(v, BufferJSON.replacer)
  const deserialize = (s) => JSON.parse(s, BufferJSON.reviver)

  // Load creds (or initialize fresh).
  const existing = await store.getDoc(sessionPath)
  const creds =
    existing && existing.creds ? deserialize(existing.creds) : initAuthCreds()

  const keyId = (type, id) => `${type}--${id}`.replace(/\//g, '_')

  const state = {
    creds,
    keys: {
      get: async (type, ids) => {
        const result = {}
        await Promise.all(
          ids.map(async (id) => {
            const doc = await store.getDoc(`${keysCol}/${keyId(type, id)}`)
            if (!doc || doc.value == null) return
            let value = deserialize(doc.value)
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value)
            }
            result[id] = value
          }),
        )
        return result
      },
      set: async (data) => {
        const tasks = []
        for (const type of Object.keys(data)) {
          for (const id of Object.keys(data[type])) {
            const value = data[type][id]
            const docPath = `${keysCol}/${keyId(type, id)}`
            if (value) {
              tasks.push(store.setDoc(docPath, { value: serialize(value) }, false))
            } else {
              tasks.push(store.deleteDoc(docPath))
            }
          }
        }
        await Promise.all(tasks)
      },
    },
  }

  const saveCreds = async () => {
    await store.setDoc(sessionPath, { creds: serialize(state.creds) })
  }

  return { state, saveCreds }
}

module.exports = { useStoreAuthState }
