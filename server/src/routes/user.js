const express = require('express')
const store = require('../services/store')
const antiBan = require('../services/antiBan')

const router = express.Router()

// GET /api/user/antiban — number-safety config (merged with defaults).
router.get('/antiban', async (req, res) => {
  const cfg = await antiBan.getConfig(req.user.uid)
  res.json({ config: cfg, defaults: antiBan.DEFAULTS })
})

// PUT /api/user/antiban — update number-safety config.
router.put('/antiban', async (req, res) => {
  const { uid } = req.user
  const allowed = [
    'enabled', 'humanTyping', 'spintax', 'warmup', 'preset',
    'minDelayMs', 'maxDelayMs', 'maxPerDay',
  ]
  const patch = {}
  for (const k of allowed) {
    if (req.body && req.body[k] !== undefined) patch[k] = req.body[k]
  }
  const existing = await store.getDoc(`users/${uid}`)
  await store.setDoc(`users/${uid}`, {
    antiBan: antiBan.normalizeConfig({ ...(existing?.antiBan || {}), ...patch }),
  })
  antiBan.invalidate(uid)
  res.json({ config: await antiBan.getConfig(uid) })
})

// GET /api/user/me — current profile (creates the record on first call).
router.get('/me', async (req, res) => {
  const { uid, email, name, picture } = req.user
  let user = await store.getDoc(`users/${uid}`)
  if (!user) {
    user = {
      name: name || '',
      email: email || '',
      photoUrl: picture || '',
      onboardingCompleted: false,
      createdAt: Date.now(),
    }
    await store.setDoc(`users/${uid}`, user)
    user = await store.getDoc(`users/${uid}`)
  }
  res.json({ user })
})

// PATCH /api/user/me — update profile fields (name, businessType, goal).
router.patch('/me', async (req, res) => {
  const { uid } = req.user
  const { name, email, businessType, goal } = req.body || {}
  await store.setDoc(`users/${uid}`, {
    ...(name !== undefined && { name }),
    ...(email !== undefined && { email: String(email).trim() }),
    ...(businessType !== undefined && { businessType }),
    ...(goal !== undefined && { goal }),
  })
  res.json({ user: await store.getDoc(`users/${uid}`) })
})

// GET /api/user/stats — dashboard summary counts.
router.get('/stats', async (req, res) => {
  const { uid } = req.user
  const base = `users/${uid}`
  const [messages, contacts, sessions, flows] = await Promise.all([
    store.listDocs(`${base}/messages`),
    store.countDocs(`${base}/contacts`),
    store.listDocs(`${base}/sessions`),
    store.listDocs(`${base}/flows`),
  ])
  const received = messages.filter((message) => message.direction === 'in').length
  const sent = messages.filter((message) => message.direction === 'out').length
  const localDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const activity = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(dayStart)
    day.setDate(day.getDate() - (6 - index))
    return { date: day.toISOString(), received: 0, sent: 0 }
  })
  const activityByDate = new Map(activity.map((item) => [localDateKey(new Date(item.date)), item]))
  messages.forEach((message) => {
    const timestamp = new Date(message.timestamp || message.createdAt || 0)
    const day = Number.isNaN(timestamp.getTime()) ? null : localDateKey(timestamp)
    const bucket = day && activityByDate.get(day)
    if (bucket && (message.direction === 'in' || message.direction === 'out')) bucket[message.direction === 'in' ? 'received' : 'sent'] += 1
  })
  res.json({
    stats: {
      received,
      sent,
      contacts,
      connectedNumbers: sessions.filter((s) => s.status === 'connected').length,
      totalNumbers: sessions.length,
      publishedFlows: flows.filter((f) => f.status === 'published').length,
      totalFlows: flows.length,
      activity,
    },
  })
})

// POST /api/user/onboarding — save onboarding profile.
router.post('/onboarding', async (req, res) => {
  const { uid } = req.user
  const { name, businessType, goal, teamSize } = req.body || {}
  await store.setDoc(`users/${uid}`, {
    name: name || req.user.name || '',
    businessType: businessType || '',
    goal: goal || '',
    teamSize: teamSize || '',
    onboardingCompleted: true,
  })
  const user = await store.getDoc(`users/${uid}`)
  res.json({ user })
})

module.exports = router
