require('dotenv').config()
const http = require('http')
const express = require('express')
const cors = require('cors')

require('./config/firebase') // initialize Firebase Admin first
const realtime = require('./services/realtime')
const wa = require('./services/whatsappService')

const app = express()
const PORT = process.env.PORT || 5000

// CORS — allow all origins and methods, and the headers we use (Authorization
// for Firebase ID tokens, plus dev headers). `cors()` also answers the OPTIONS
// preflight automatically when registered globally.
const corsOptions = {
  origin: true, // reflect the request origin (allows any site)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-dev-uid', 'x-dev-email'],
  credentials: true,
}
app.use(cors(corsOptions))
app.use(express.json({ limit: '2mb' }))

// Public health checks for platforms that probe either root or API paths.
const health = (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
}
app.get('/health', health)
app.get('/api/health', health)

// Routes
app.use('/api/user', require('./routes/user'))
app.use('/api/wa', require('./routes/wa'))
app.use('/api/flows', require('./routes/flows'))
app.use('/api/templates', require('./routes/templates'))
app.use('/api/ai', require('./routes/ai'))
app.use('/api/inbox', require('./routes/inbox'))
app.use('/api/products', require('./routes/products'))
app.use('/api/bookings', require('./routes/bookings'))

const server = http.createServer(app)
realtime.attach(server) // WebSocket hub at /ws

server.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`)
  require('./services/scheduler').start() // fire scheduled reminders/drips
  // Rehydrate persisted WhatsApp sessions (skippable for local UI testing).
  if (process.env.SKIP_WA_BOOT !== '1') await wa.bootReconnect()
})
