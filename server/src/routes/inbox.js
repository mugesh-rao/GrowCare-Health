const express = require('express')
const { auth } = require('../middleware/auth')
const store = require('../services/store')
const wa = require('../services/whatsappService')

const router = express.Router()
router.use(auth)

const contactsPath = (uid) => `users/${uid}/contacts`
const contactPath = (uid, phone) => `users/${uid}/contacts/${phone}`

// GET /api/inbox/conversations?status=&tag=&q=
router.get('/conversations', async (req, res) => {
  const { uid } = req.user
  let list = await store.listDocs(contactsPath(uid))
  const { status, tag, q } = req.query
  if (status) list = list.filter((c) => (c.status || 'open') === status)
  if (tag) list = list.filter((c) => Array.isArray(c.tags) && c.tags.includes(tag))
  if (q) {
    const needle = String(q).toLowerCase()
    list = list.filter(
      (c) =>
        String(c.name || '').toLowerCase().includes(needle) ||
        String(c.phone || '').includes(needle),
    )
  }
  list.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0))
  res.json({ conversations: list })
})

// GET /api/inbox/tags — distinct tags across contacts (for segments).
router.get('/tags', async (req, res) => {
  const list = await store.listDocs(contactsPath(req.user.uid))
  const set = new Set()
  for (const c of list) (c.tags || []).forEach((t) => set.add(t))
  res.json({ tags: [...set].sort() })
})

// GET /api/inbox/conversations/:phone
router.get('/conversations/:phone', async (req, res) => {
  const c = await store.getDoc(contactPath(req.user.uid, req.params.phone))
  if (!c) return res.status(404).json({ message: 'Conversation not found.' })
  res.json({ conversation: c })
})

// GET /api/inbox/conversations/:phone/messages
router.get('/conversations/:phone/messages', async (req, res) => {
  const { uid } = req.user
  const msgs = await store.listDocs(`users/${uid}/messages`, [
    ['contactId', '==', req.params.phone],
  ])
  msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
  res.json({ messages: msgs.slice(-200) })
})

// POST /api/inbox/conversations/:phone/reply { sessionId?, payload }
router.post('/conversations/:phone/reply', async (req, res) => {
  const { uid } = req.user
  const phone = req.params.phone
  const { sessionId, payload, pauseBot } = req.body || {}
  const contact = await store.getDoc(contactPath(uid, phone))
  const sid = sessionId || contact?.sessionId
  if (!sid) return res.status(400).json({ message: 'No WhatsApp number for this conversation.' })
  try {
    await wa.sendMessage(uid, sid, phone, payload)
    const body = typeof payload === 'string' ? payload : payload?.text || ''
    const id = store.genId()
    const now = Date.now()
    await store.setDoc(`users/${uid}/messages/${id}`, {
      sessionId: sid, contactId: phone, direction: 'out', body, agent: true, timestamp: now,
    })
    await store.setDoc(contactPath(uid, phone), {
      lastMessage: body, lastMessageAt: now, lastDirection: 'out', unread: 0,
      ...(pauseBot ? { botPaused: true } : {}),
    })
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ message: e.message })
  }
})

// PATCH /api/inbox/conversations/:phone  { status, assignee, tags, attributes, botPaused }
router.patch('/conversations/:phone', async (req, res) => {
  const { uid } = req.user
  const path = contactPath(uid, req.params.phone)
  if (!(await store.getDoc(path))) return res.status(404).json({ message: 'Conversation not found.' })
  const { status, assignee, tags, attributes, botPaused } = req.body || {}
  await store.setDoc(path, {
    ...(status !== undefined && { status }),
    ...(assignee !== undefined && { assignee }),
    ...(tags !== undefined && { tags }),
    ...(attributes !== undefined && { attributes }),
    ...(botPaused !== undefined && { botPaused }),
  })
  res.json({ conversation: await store.getDoc(path) })
})

// POST /api/inbox/conversations/:phone/read
router.post('/conversations/:phone/read', async (req, res) => {
  await store.setDoc(contactPath(req.user.uid, req.params.phone), { unread: 0 })
  res.json({ ok: true })
})

// GET/POST notes
router.get('/conversations/:phone/notes', async (req, res) => {
  const notes = await store.listDocs(`users/${req.user.uid}/contacts/${req.params.phone}/notes`)
  notes.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
  res.json({ notes })
})
router.post('/conversations/:phone/notes', async (req, res) => {
  const { uid } = req.user
  const id = store.genId()
  const note = { body: req.body?.body || '', author: req.user.name || 'agent', createdAt: Date.now() }
  await store.setDoc(`users/${uid}/contacts/${req.params.phone}/notes/${id}`, note)
  res.status(201).json({ note: { id, ...note } })
})

module.exports = router
