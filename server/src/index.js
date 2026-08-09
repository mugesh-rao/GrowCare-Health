require('dotenv').config()
const http = require('http')
const express = require('express')

const realtime = require('./services/realtime')
const wa = require('./services/whatsappService')
const network = require('./services/network')

const app = express()
const PORT = Number(process.env.PORT || 5000)
const HOST = process.env.HOST || '127.0.0.1'

// The webview's own origin differs by OS (`tauri://localhost` on macOS/Linux,
// `http://tauri.localhost` on Windows) plus the Vite dev server during
// `tauri dev`. This server never leaves loopback/LAN and has no auth/cookies
// to leak, so it's safe to simply reflect whatever origin asked — the
// alternative (hardcoding one platform's origin) is what silently broke every
// API call, including the WhatsApp QR fetch, on Windows packaged builds.
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})
// Report text and short consultation audio snippets are sent directly to the
// local process.  They never leave the desktop application unless a clinic
// explicitly configures one of its existing external integrations.
app.use(express.json({ limit: '15mb' }))

// GrowCare is a single-user, local desktop application. Every request belongs
// to its local workspace; there is no account sign-in or authentication layer.
app.use((req, _res, next) => {
  req.user = {
    uid: 'local-owner',
    email: 'local@growcare.app',
    name: 'Local Owner',
    picture: null,
  }
  next()
})

const health = (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
}
app.get('/health', health)
app.get('/api/health', health)

app.use('/api/user', require('./routes/user'))
app.use('/api/wa', require('./routes/wa'))
app.use('/api/flows', require('./routes/flows'))
app.use('/api/templates', require('./routes/templates'))
app.use('/api/ai', require('./routes/ai'))
app.use('/api/inbox', require('./routes/inbox'))
app.use('/api/products', require('./routes/products'))
app.use('/api/bookings', require('./routes/bookings'))
app.use('/api/clinical', require('./routes/clinical'))
app.use('/api/network', require('./routes/network'))

const server = http.createServer(app)
realtime.attach(server)

server.listen(PORT, HOST, async () => {
  console.log(`GrowCare local server running on http://${HOST}:${PORT}`)
  require('./services/scheduler').start()
  if (process.env.SKIP_WA_BOOT !== '1') await wa.bootReconnect()
  await network.start()
})

function shutdown(signal) {
  console.log(`Received ${signal}; stopping GrowCare local server.`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 5000).unref()
}

process.once('SIGTERM', () => shutdown('SIGTERM'))
process.once('SIGINT', () => shutdown('SIGINT'))
