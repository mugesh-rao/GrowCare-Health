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
  const { name, businessType, goal } = req.body || {}
  await store.setDoc(`users/${uid}`, {
    ...(name !== undefined && { name }),
    ...(businessType !== undefined && { businessType }),
    ...(goal !== undefined && { goal }),
  })
  res.json({ user: await store.getDoc(`users/${uid}`) })
})

// GET /api/user/stats — dashboard summary counts.
router.get('/stats', async (req, res) => {
  const { uid } = req.user
  const base = `users/${uid}`
  const [received, sent, contacts, sessions, flows] = await Promise.all([
    store.countDocs(`${base}/messages`, [['direction', '==', 'in']]),
    store.countDocs(`${base}/messages`, [['direction', '==', 'out']]),
    store.countDocs(`${base}/contacts`),
    store.listDocs(`${base}/sessions`),
    store.listDocs(`${base}/flows`),
  ])
  res.json({
    stats: {
      received,
      sent,
      contacts,
      connectedNumbers: sessions.filter((s) => s.status === 'connected').length,
      totalNumbers: sessions.length,
      publishedFlows: flows.filter((f) => f.status === 'published').length,
      totalFlows: flows.length,
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
