const express = require('express')
const { auth } = require('../middleware/auth')
const store = require('../services/store')
const {
  validateCarousel,
  validateHydratedTemplate,
  validateProduct,
} = require('../services/advancedMessages')
const { validateButtons } = require('../services/buttons')
const { validateExternalAdReply } = require('../services/externalAdReply')
const { validateEvent } = require('../services/events')
const { validateList } = require('../services/lists')
const { sanitizeSendPayload } = require('../services/sendPayload')

const router = express.Router()
router.use(auth)

const base = (uid) => `users/${uid}/templates`

// GET /api/templates — list this user's message+button templates.
router.get('/', async (req, res) => {
  res.json({ templates: await store.listDocs(base(req.user.uid)) })
})

// POST /api/templates — create a template { name, sendMode, text, footer, title, buttons, list, event, externalAdReply, template, product, carousel }.
router.post('/', async (req, res) => {
  const { uid } = req.user
  const id = store.genId()
  const { name, sendMode, text, footer, title, buttons, list, event, externalAdReply, template, product, carousel } = req.body || {}
  const payload = sanitizeSendPayload({ sendMode, text, footer, title, buttons, list, event, externalAdReply, template, product, carousel })
  const buttonErrors = validateButtons(payload.buttons)
  if (buttonErrors.length) {
    return res.status(400).json({ message: buttonErrors[0] })
  }
  const listErrors = validateList(payload.list)
  if (listErrors.length) {
    return res.status(400).json({ message: listErrors[0] })
  }
  const eventErrors = validateEvent(payload.event)
  if (eventErrors.length) {
    return res.status(400).json({ message: eventErrors[0] })
  }
  const adErrors = validateExternalAdReply(payload.externalAdReply)
  if (adErrors.length) {
    return res.status(400).json({ message: adErrors[0] })
  }
  const templateErrors = validateHydratedTemplate(payload.template)
  if (templateErrors.length) {
    return res.status(400).json({ message: templateErrors[0] })
  }
  const productErrors = validateProduct(payload.product)
  if (productErrors.length) {
    return res.status(400).json({ message: productErrors[0] })
  }
  const carouselErrors = validateCarousel(payload.carousel)
  if (carouselErrors.length) {
    return res.status(400).json({ message: carouselErrors[0] })
  }
  if (payload.externalAdReply && !String(payload.text || '').trim()) {
    return res.status(400).json({ message: 'External ad reply message text is required.' })
  }
  const templateDoc = {
    name: name || 'Untitled template',
    sendMode: payload.sendMode,
    text: payload.text,
    footer: payload.footer,
    title: payload.title,
    buttons: payload.buttons,
    list: payload.list,
    event: payload.event,
    externalAdReply: payload.externalAdReply,
    template: payload.template,
    product: payload.product,
    carousel: payload.carousel,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await store.setDoc(`${base(uid)}/${id}`, templateDoc)
  res.status(201).json({ template: { id, ...templateDoc } })
})

// PUT /api/templates/:id
router.put('/:id', async (req, res) => {
  const { uid } = req.user
  const path = `${base(uid)}/${req.params.id}`
  const existing = await store.getDoc(path)
  if (!existing) return res.status(404).json({ message: 'Template not found.' })
  const { name, sendMode, text, footer, title, buttons, list, event, externalAdReply, template, product, carousel } = req.body || {}
  const merged = {
    ...existing,
    ...(sendMode !== undefined && { sendMode }),
    ...(name !== undefined && { name }),
    ...(text !== undefined && { text }),
    ...(footer !== undefined && { footer }),
    ...(title !== undefined && { title }),
    ...(buttons !== undefined && { buttons }),
    ...(list !== undefined && { list }),
    ...(event !== undefined && { event }),
    ...(externalAdReply !== undefined && { externalAdReply }),
    ...(template !== undefined && { template }),
    ...(product !== undefined && { product }),
    ...(carousel !== undefined && { carousel }),
  }
  const payload = sanitizeSendPayload(merged)
  const buttonErrors = validateButtons(payload.buttons)
  if (buttonErrors.length) {
    return res.status(400).json({ message: buttonErrors[0] })
  }
  const listErrors = validateList(payload.list)
  if (listErrors.length) {
    return res.status(400).json({ message: listErrors[0] })
  }
  const eventErrors = validateEvent(payload.event)
  if (eventErrors.length) {
    return res.status(400).json({ message: eventErrors[0] })
  }
  const adErrors = validateExternalAdReply(payload.externalAdReply)
  if (adErrors.length) {
    return res.status(400).json({ message: adErrors[0] })
  }
  const templateErrors = validateHydratedTemplate(payload.template)
  if (templateErrors.length) {
    return res.status(400).json({ message: templateErrors[0] })
  }
  const productErrors = validateProduct(payload.product)
  if (productErrors.length) {
    return res.status(400).json({ message: productErrors[0] })
  }
  const carouselErrors = validateCarousel(payload.carousel)
  if (carouselErrors.length) {
    return res.status(400).json({ message: carouselErrors[0] })
  }
  if (payload.externalAdReply && !String(payload.text || '').trim()) {
    return res.status(400).json({ message: 'External ad reply message text is required.' })
  }
  await store.setDoc(path, {
    sendMode: payload.sendMode,
    ...(name !== undefined && { name }),
    text: payload.text,
    footer: payload.footer,
    title: payload.title,
    buttons: payload.buttons,
    list: payload.list,
    event: payload.event,
    externalAdReply: payload.externalAdReply,
    template: payload.template,
    product: payload.product,
    carousel: payload.carousel,
    updatedAt: Date.now(),
  })
  res.json({ template: await store.getDoc(path) })
})

// DELETE /api/templates/:id
router.delete('/:id', async (req, res) => {
  await store.deleteDoc(`${base(req.user.uid)}/${req.params.id}`)
  res.json({ ok: true })
})

module.exports = router
