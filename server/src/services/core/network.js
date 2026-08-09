/**
 * network — LAN device discovery + pairing handshake (Settings → Network Pairing).
 *
 * Off by default. When enabled, this device:
 *  - broadcasts a UDP announce every few seconds so other GrowCare instances
 *    on the same hotspot/LAN can see it ("discovered"),
 *  - listens for other instances' announces,
 *  - runs a small dedicated HTTP listener (separate from the main API, bound
 *    to 0.0.0.0) that only understands the pairing handshake. It never
 *    exposes patient/WhatsApp data — pairing here only builds a trusted
 *    device list; nothing is synced over it yet.
 *
 * Pairing is mutual consent: device A invites device B, B's staff Accepts or
 * Declines from their own Settings, and only then do both sides store each
 * other under `device/paired`, keyed by the peer's stable deviceId.
 */
const dgram = require('dgram')
const http = require('http')
const os = require('os')
const store = require('./store')
const realtime = require('./realtime')

const UDP_PORT = 17845
const PAIR_PORT = 17844
const ANNOUNCE_INTERVAL_MS = 3000
const STALE_AFTER_MS = 12000
const UID = 'local-owner' // single-user local app (see services/realtime.js)

let identity = null // { deviceId }
let config = { enabled: false, deviceName: os.hostname() }
let udpSocket = null
let pairServer = null
let announceTimer = null
let sweepTimer = null
const discovered = new Map() // deviceId -> { deviceId, deviceName, host, apiPort, lastSeen }

function localInterfaces() {
  const nets = os.networkInterfaces()
  const addrs = []
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) addrs.push(net)
    }
  }
  return addrs
}

function primaryLocalIp() {
  return localInterfaces()[0]?.address || null
}

function broadcastAddresses() {
  const out = new Set(['255.255.255.255'])
  for (const net of localInterfaces()) {
    const ip = net.address.split('.').map(Number)
    const mask = net.netmask.split('.').map(Number)
    if (ip.length === 4 && mask.length === 4) {
      out.add(ip.map((p, i) => (p | (~mask[i] & 255)) & 255).join('.'))
    }
  }
  return [...out]
}

async function ensureIdentity() {
  if (identity) return identity
  const doc = await store.getDoc('device/identity')
  identity = doc ? { deviceId: doc.deviceId } : { deviceId: store.genId() }
  if (!doc) await store.setDoc('device/identity', identity)
  return identity
}

async function loadConfig() {
  const doc = await store.getDoc('device/network')
  config = {
    enabled: Boolean(doc?.enabled),
    deviceName: doc?.deviceName || os.hostname(),
  }
  return config
}

async function saveConfig(patch) {
  config = { ...config, ...patch }
  await store.setDoc('device/network', config)
  return config
}

function emit(type, extra = {}) {
  realtime.emitToUser(UID, { type, ...extra })
}

function pruneStale() {
  const now = Date.now()
  for (const [id, d] of discovered) {
    if (now - d.lastSeen > STALE_AFTER_MS) discovered.delete(id)
  }
}

function startUdp() {
  if (udpSocket) return
  udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
  udpSocket.on('message', (msg) => {
    let payload
    try {
      payload = JSON.parse(msg.toString())
    } catch {
      return
    }
    if (payload?.type !== 'growcare-announce' || payload.deviceId === identity.deviceId) return
    discovered.set(payload.deviceId, {
      deviceId: payload.deviceId,
      deviceName: payload.deviceName || 'GrowCare device',
      host: payload.host,
      apiPort: payload.apiPort || PAIR_PORT,
      lastSeen: Date.now(),
    })
  })
  udpSocket.on('error', (e) => console.error('[network] udp error:', e.message))
  udpSocket.bind(UDP_PORT, () => {
    try {
      udpSocket.setBroadcast(true)
    } catch (e) {
      console.error('[network] setBroadcast failed:', e.message)
    }
  })

  announceTimer = setInterval(() => {
    const host = primaryLocalIp()
    if (!host) return // not on any network yet — nothing useful to announce
    const payload = Buffer.from(
      JSON.stringify({
        type: 'growcare-announce',
        deviceId: identity.deviceId,
        deviceName: config.deviceName,
        apiPort: PAIR_PORT,
        host,
      }),
    )
    for (const addr of broadcastAddresses()) {
      udpSocket.send(payload, UDP_PORT, addr, () => {})
    }
  }, ANNOUNCE_INTERVAL_MS)
  announceTimer.unref?.()

  sweepTimer = setInterval(pruneStale, ANNOUNCE_INTERVAL_MS)
  sweepTimer.unref?.()
}

function stopUdp() {
  clearInterval(announceTimer)
  clearInterval(sweepTimer)
  announceTimer = null
  sweepTimer = null
  discovered.clear()
  try {
    udpSocket?.close()
  } catch {
    /* ignore */
  }
  udpSocket = null
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1e6) req.destroy(new Error('Request too large.'))
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

async function handlePairRequest(body) {
  const { requestId, fromDeviceId, fromDeviceName, fromHost, fromApiPort } = body
  if (!requestId || !fromDeviceId || !fromHost) throw new Error('Malformed pairing request.')
  await store.setDoc(`device/pending/${requestId}`, {
    fromDeviceId,
    fromDeviceName: fromDeviceName || 'GrowCare device',
    fromHost,
    fromApiPort: fromApiPort || PAIR_PORT,
    receivedAt: Date.now(),
  })
  emit('network-pending')
}

async function handlePairResponse(body) {
  const { requestId, accepted, deviceId, deviceName, host, apiPort } = body
  if (!requestId || !deviceId) throw new Error('Malformed pairing response.')
  await store.deleteDoc(`device/outgoing/${requestId}`)
  if (accepted) {
    await store.setDoc(`device/paired/${deviceId}`, {
      deviceName: deviceName || 'GrowCare device',
      host,
      apiPort: apiPort || PAIR_PORT,
      pairedAt: Date.now(),
      direction: 'outbound',
    })
    emit('network-paired')
  } else {
    emit('network-declined', { deviceName: deviceName || 'The device' })
  }
}

async function handlePairRevoke(body) {
  const { deviceId } = body
  if (!deviceId) return
  await store.deleteDoc(`device/paired/${deviceId}`)
  emit('network-paired')
}

function startPairServer() {
  if (pairServer) return
  pairServer = http.createServer(async (req, res) => {
    if (req.method !== 'POST') return sendJson(res, 404, { message: 'Not found.' })
    try {
      const body = await readJson(req)
      if (req.url === '/pair-request') await handlePairRequest(body)
      else if (req.url === '/pair-response') await handlePairResponse(body)
      else if (req.url === '/pair-revoke') await handlePairRevoke(body)
      else return sendJson(res, 404, { message: 'Not found.' })
      sendJson(res, 200, { ok: true })
    } catch (e) {
      sendJson(res, 400, { message: e.message })
    }
  })
  pairServer.on('error', (e) => console.error('[network] pairing listener error:', e.message))
  pairServer.listen(PAIR_PORT, '0.0.0.0')
}

function stopPairServer() {
  try {
    pairServer?.close()
  } catch {
    /* ignore */
  }
  pairServer = null
}

function httpPost(host, port, path, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host,
        port,
        path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 4000,
      },
      (res) => {
        res.on('data', () => {})
        res.on('end', () => resolve())
      },
    )
    req.on('timeout', () => req.destroy(new Error('Timed out.')))
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function start() {
  await ensureIdentity()
  await loadConfig()
  if (config.enabled) {
    startUdp()
    startPairServer()
  }
}

async function setEnabled(enabled) {
  await saveConfig({ enabled: Boolean(enabled) })
  if (config.enabled) {
    startUdp()
    startPairServer()
  } else {
    stopUdp()
    stopPairServer()
  }
  emit('network-status', { enabled: config.enabled })
  return status()
}

async function setDeviceName(deviceName) {
  await saveConfig({ deviceName: String(deviceName || '').trim().slice(0, 60) || os.hostname() })
  return status()
}

function status() {
  return {
    enabled: config.enabled,
    deviceId: identity?.deviceId || null,
    deviceName: config.deviceName,
    localIp: primaryLocalIp(),
  }
}

async function pairedDeviceIds() {
  const docs = await store.listDocs('device/paired')
  return new Set(docs.map((d) => d.id))
}

async function listDiscovered() {
  pruneStale()
  const paired = await pairedDeviceIds()
  return [...discovered.values()]
    .filter((d) => !paired.has(d.deviceId))
    .map(({ deviceId, deviceName, host, lastSeen }) => ({ deviceId, deviceName, host, lastSeen }))
}

function listPending() {
  return store.listDocs('device/pending')
}

function listOutgoing() {
  return store.listDocs('device/outgoing')
}

function listPaired() {
  return store.listDocs('device/paired')
}

/** Invite a discovered device to pair. */
async function invite(targetDeviceId) {
  const target = discovered.get(targetDeviceId)
  if (!target) throw new Error('That device is no longer visible on the network.')
  const requestId = store.genId()
  await store.setDoc(`device/outgoing/${requestId}`, {
    toDeviceId: target.deviceId,
    toDeviceName: target.deviceName,
    toHost: target.host,
    toApiPort: target.apiPort,
    sentAt: Date.now(),
  })
  const body = JSON.stringify({
    requestId,
    fromDeviceId: identity.deviceId,
    fromDeviceName: config.deviceName,
    fromHost: primaryLocalIp(),
    fromApiPort: PAIR_PORT,
  })
  try {
    await httpPost(target.host, target.apiPort, '/pair-request', body)
  } catch (e) {
    await store.deleteDoc(`device/outgoing/${requestId}`)
    throw new Error(`Could not reach ${target.deviceName}: ${e.message}`)
  }
  return { requestId }
}

async function acceptPending(requestId) {
  const pending = await store.getDoc(`device/pending/${requestId}`)
  if (!pending) throw new Error('That pairing request is no longer available.')
  await store.setDoc(`device/paired/${pending.fromDeviceId}`, {
    deviceName: pending.fromDeviceName,
    host: pending.fromHost,
    apiPort: pending.fromApiPort,
    pairedAt: Date.now(),
    direction: 'inbound',
  })
  await store.deleteDoc(`device/pending/${requestId}`)
  const body = JSON.stringify({
    requestId,
    accepted: true,
    deviceId: identity.deviceId,
    deviceName: config.deviceName,
    host: primaryLocalIp(),
    apiPort: PAIR_PORT,
  })
  httpPost(pending.fromHost, pending.fromApiPort, '/pair-response', body).catch(() => {})
  return { ok: true }
}

async function declinePending(requestId) {
  const pending = await store.getDoc(`device/pending/${requestId}`)
  if (!pending) return { ok: true }
  await store.deleteDoc(`device/pending/${requestId}`)
  const body = JSON.stringify({
    requestId,
    accepted: false,
    deviceId: identity.deviceId,
    deviceName: config.deviceName,
  })
  httpPost(pending.fromHost, pending.fromApiPort, '/pair-response', body).catch(() => {})
  return { ok: true }
}

async function revokePaired(peerDeviceId) {
  const peer = await store.getDoc(`device/paired/${peerDeviceId}`)
  await store.deleteDoc(`device/paired/${peerDeviceId}`)
  if (peer) {
    const body = JSON.stringify({ deviceId: identity.deviceId })
    httpPost(peer.host, peer.apiPort, '/pair-revoke', body).catch(() => {})
  }
  return { ok: true }
}

module.exports = {
  start,
  status,
  setEnabled,
  setDeviceName,
  listDiscovered,
  listPending,
  listOutgoing,
  listPaired,
  invite,
  acceptPending,
  declinePending,
  revokePaired,
}
