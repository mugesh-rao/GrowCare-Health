const { WebSocketServer } = require('ws')
const url = require('url')

/** Local WebSocket hub for QR, connection-status, and message events. */
const socketsByUid = new Map()

function resolveUid() {
  return 'local-owner'
}

function attach(server) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = url.parse(req.url)
    if (pathname !== '/ws') return socket.destroy()

    const uid = resolveUid()

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.uid = uid
      if (!socketsByUid.has(uid)) socketsByUid.set(uid, new Set())
      socketsByUid.get(uid).add(ws)
      ws.send(JSON.stringify({ type: 'connected' }))

      ws.on('close', () => {
        const sockets = socketsByUid.get(uid)
        if (!sockets) return
        sockets.delete(ws)
        if (!sockets.size) socketsByUid.delete(uid)
      })
    })
  })

  console.log('[realtime] Local WebSocket hub attached at /ws')
}

function emitToUser(uid, payload) {
  const sockets = socketsByUid.get(uid)
  if (!sockets) return
  const data = JSON.stringify(payload)
  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) ws.send(data)
  }
}

module.exports = { attach, emitToUser }
