const express = require('express')
const store = require('../services/core/store')
const wa = require('../services/whatsapp/whatsappService')
const { sanitizeSendPayload } = require('../services/whatsapp/sendPayload')

const router = express.Router()

// POST /api/wa/sessions — create + start a session (QR streamed over /ws).
router.post('/sessions', async (req, res) => {
  try {
    const { uid } = req.user
    const sessionId = store.genId()
    const label = (req.body && req.body.label) || 'WhatsApp'
    await wa.startSession(uid, sessionId, { label })
    res.status(201).json({ sessionId, label, status: 'connecting' })
  } catch (e) {
    res.status(500).json({ message: e.message })
  }
})

// GET /api/wa/sessions — list this user's sessions + live status.
router.get('/sessions', async (req, res) => {
  const sessions = await wa.listSessions(req.user.uid)
  res.json({ sessions })
})

// GET /api/wa/sessions/:id — current status (+ live QR if pairing).
router.get('/sessions/:id', async (req, res) => {
  const { uid } = req.user
  const entry = wa.getEntry(uid, req.params.id)
  const doc = await store.getDoc(`users/${uid}/sessions/${req.params.id}`)
  if (!doc && !entry) return res.status(404).json({ message: 'Session not found.' })
  res.json({
    id: req.params.id,
    label: doc?.label,
    phone: doc?.phone || null,
    status: entry?.status || doc?.status || 'disconnected',
    qr: entry?.qr || null,
  })
})

// POST /api/wa/sessions/:id/logout
router.post('/sessions/:id/logout', async (req, res) => {
  await wa.logoutSession(req.user.uid, req.params.id)
  res.json({ ok: true })
})

// DELETE /api/wa/sessions/:id
router.delete('/sessions/:id', async (req, res) => {
  await wa.deleteSession(req.user.uid, req.params.id)
  res.json({ ok: true })
})

// PUT /api/wa/sessions/:id/proxy  { proxyUrl } — set/clear per-number proxy (anti-ban).
router.put('/sessions/:id/proxy', async (req, res) => {
  try {
    const result = await wa.setProxy(req.user.uid, req.params.id, req.body?.proxyUrl || '')
    res.json(result)
  } catch (e) {
    res.status(400).json({ message: e.message })
  }
})

// POST /api/wa/sessions/:id/send  { to, sendMode, text, footer?, title?, buttons?, list?, event?, externalAdReply?, template?, product?, carousel? }
router.post('/sessions/:id/send', async (req, res) => {
  try {
    const { to, sendMode, text, footer, title, buttons, list, event, externalAdReply, template, product, carousel } = req.body || {}
    const payload = sanitizeSendPayload({ sendMode, text, footer, title, buttons, list, event, externalAdReply, template, product, carousel })
    if (
      !to ||
      (
        !payload.text &&
        !payload.buttons.length &&
        !payload.list &&
        !payload.event &&
        !payload.externalAdReply &&
        !payload.template &&
        !payload.product &&
        !payload.carousel
      )
    ) {
      return res.status(400).json({
        message: '`to` and one supported message payload are required.',
      })
    }
    if (payload.externalAdReply && !String(payload.text || '').trim()) {
      return res.status(400).json({ message: 'External ad reply message text is required.' })
    }
    const result = await wa.sendMessage(req.user.uid, req.params.id, to, payload)
    res.json({ ok: true, ...result })
  } catch (e) {
    res.status(400).json({ message: e.message })
  }
})

// POST /api/wa/sessions/:id/bulk  { recipients:[], sendMode, text, footer?, title?, buttons?, list?, event?, externalAdReply?, template?, product?, carousel? }
router.post('/sessions/:id/bulk', async (req, res) => {
  const { recipients, sendMode, text, footer, title, buttons, list, event, externalAdReply, template, product, carousel } = req.body || {}
  const payload = sanitizeSendPayload({ sendMode, text, footer, title, buttons, list, event, externalAdReply, template, product, carousel })
  if (
    !Array.isArray(recipients) ||
    (
      !payload.text &&
      !payload.buttons.length &&
      !payload.list &&
      !payload.event &&
      !payload.externalAdReply &&
      !payload.template &&
      !payload.product &&
      !payload.carousel
    )
  ) {
    return res.status(400).json({
      message: '`recipients[]` and one supported message payload are required.',
    })
  }
  if (payload.externalAdReply && !String(payload.text || '').trim()) {
    return res.status(400).json({ message: 'External ad reply message text is required.' })
  }
  const results = []
  for (const to of recipients) {
    try {
      await wa.sendMessage(req.user.uid, req.params.id, to, payload)
      results.push({ to, ok: true })
    } catch (e) {
      results.push({ to, ok: false, error: e.message })
    }
    await new Promise((r) => setTimeout(r, 800)) // gentle pacing
  }
  res.json({ results })
})

module.exports = router
