const { WebSocketServer } = require('ws')
const url = require('url')
const { auth: firebaseAuth, firebaseEnabled } = require('../config/firebase')

/**
 * Realtime hub — one WebSocket endpoint (/ws) that streams events to a user:
 *   { type: 'qr', sessionId, qr }
 *   { type: 'status', sessionId, status }
 *   { type: 'message', sessionId, message }
 *
 * Clients connect to:  ws://host/ws?token=<firebaseIdToken>
 * In dev mode (no Firebase) a token of "dev" + ?uid=<uid> is accepted.
 */
const socketsByUid = new Map() // uid -> Set<ws>

async function resolveUid(query) {
  if (!firebaseEnabled) return query.uid || 'dev-user'
  if (!query.token) return null
  try {
    const decoded = await firebaseAuth.verifyIdToken(query.token)
    return decoded.uid
  } catch {
    return null
  }
}

function attach(server) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', async (req, socket, head) => {
    const { pathname, query } = url.parse(req.url, true)
    if (pathname !== '/ws') return socket.destroy()

    const uid = await resolveUid(query)
    if (!uid) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      return socket.destroy()
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.uid = uid
      if (!socketsByUid.has(uid)) socketsByUid.set(uid, new Set())
      socketsByUid.get(uid).add(ws)
      ws.send(JSON.stringify({ type: 'connected' }))

      ws.on('close', () => {
        const set = socketsByUid.get(uid)
        if (set) {
          set.delete(ws)
          if (!set.size) socketsByUid.delete(uid)
        }
      })
    })
  })

  console.log('[realtime] WebSocket hub attached at /ws')
}

/** Push an event to every live socket of a given user. */
function emitToUser(uid, payload) {
  const set = socketsByUid.get(uid)
  if (!set) return
  const data = JSON.stringify(payload)
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) ws.send(data)
  }
}

module.exports = { attach, emitToUser }
