const express = require('express')
const store = require('../services/core/store')
const {
  validateCarousel,
  validateHydratedTemplate,
  validateProduct,
} = require('../services/whatsapp/advancedMessages')
const { validateButtons } = require('../services/whatsapp/buttons')
const { validateExternalAdReply } = require('../services/whatsapp/externalAdReply')
const { validateEvent } = require('../services/whatsapp/events')
const { validateList } = require('../services/whatsapp/lists')
const { sanitizeSendPayload } = require('../services/whatsapp/sendPayload')

const router = express.Router()

const base = (uid) => `users/${uid}/flows`

function normalizeEdge(edge, index = 0) {
  const source = String(edge?.source || '').trim()
  const target = String(edge?.target || '').trim()
  const sourceHandle = edge?.sourceHandle || null
  const targetHandle = edge?.targetHandle || null
  return {
    ...edge,
    id: edge?.id || `edge-${source}-${sourceHandle || 'default'}-${target}-${targetHandle || 'default'}-${index}`,
    source,
    target,
    sourceHandle,
    targetHandle,
    animated: edge?.animated !== false,
  }
}

function normalizeEdges(edges = []) {
  return (Array.isArray(edges) ? edges : [])
    .filter((edge) => edge?.source && edge?.target)
    .map(normalizeEdge)
}

function validateApiNode(node) {
  if (node.type !== 'api') return null
  const url = String(node.data?.url || '').trim()
  if (!url) return 'API Request node is missing the API URL.'
  return null
}

function validateRouterNode(node, edges = []) {
  if (node.type !== 'router') return null
  const prompt = String(node.data?.systemPrompt || '').trim()
  if (!prompt) return 'AI Router node is missing the routing prompt.'
  const outgoing = (Array.isArray(edges) ? edges : []).filter(
    (edge) => edge?.source === node.id && edge?.sourceHandle,
  )
  if (!outgoing.length) {
    return 'AI Router node needs at least one connected route handle.'
  }
  const fallbackRoute = String(node.data?.fallbackRoute || 'fallback').trim() || 'fallback'
  const hasFallback = outgoing.some((edge) => edge.sourceHandle === fallbackRoute)
  if (!hasFallback) {
    return `AI Router node fallback route "${fallbackRoute}" is not connected.`
  }
  return null
}

// GET /api/flows — list this user's flows.
router.get('/', async (req, res) => {
  const flows = await store.listDocs(base(req.user.uid))
  res.json({ flows })
})

// POST /api/flows — create a flow (defaults to a starter trigger node).
router.post('/', async (req, res) => {
  const { uid } = req.user
  const id = store.genId()
  const { name, nodes, edges } = req.body || {}
  const flow = {
    name: name || 'Untitled flow',
    nodes: nodes || [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 240, y: 40 },
        data: { label: 'Message received' },
      },
    ],
    edges: normalizeEdges(edges || []),
    status: 'draft',
    boundSessionIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await store.setDoc(`${base(uid)}/${id}`, flow)
  res.status(201).json({ flow: { id, ...flow } })
})

// GET /api/flows/:id
router.get('/:id', async (req, res) => {
  const flow = await store.getDoc(`${base(req.user.uid)}/${req.params.id}`)
  if (!flow) return res.status(404).json({ message: 'Flow not found.' })
  res.json({ flow })
})

// PUT /api/flows/:id — save nodes/edges/name.
router.put('/:id', async (req, res) => {
  const { uid } = req.user
  const path = `${base(uid)}/${req.params.id}`
  const existing = await store.getDoc(path)
  if (!existing) return res.status(404).json({ message: 'Flow not found.' })
  const { name, nodes, edges } = req.body || {}
  await store.setDoc(path, {
    ...(name !== undefined && { name }),
    ...(nodes !== undefined && { nodes }),
    ...(edges !== undefined && { edges: normalizeEdges(edges) }),
    updatedAt: Date.now(),
  })
  const flow = await store.getDoc(path)
  res.json({ flow })
})

// POST /api/flows/:id/publish  { publish: bool, boundSessionIds?: [] }
router.post('/:id/publish', async (req, res) => {
  const { uid } = req.user
  const path = `${base(uid)}/${req.params.id}`
  const existing = await store.getDoc(path)
  if (!existing) return res.status(404).json({ message: 'Flow not found.' })
  const publish = req.body?.publish !== false
  if (publish) {
    const invalidSendNode = (existing.nodes || []).find((node) => {
      if (node.type !== 'send') return false
      const payload = sanitizeSendPayload({
        sendMode: node.data?.sendMode,
        text: node.data?.message || '',
        footer: node.data?.footer,
        title: node.data?.title,
        buttons: node.data?.buttons || [],
        list: node.data?.list || null,
        event: node.data?.event || null,
        externalAdReply: node.data?.externalAdReply || null,
        template: node.data?.template || null,
        product: node.data?.product || null,
        carousel: node.data?.carousel || null,
      })
      return validateButtons(payload.buttons || []).length > 0
    })
    if (invalidSendNode) {
      const payload = sanitizeSendPayload({
        sendMode: invalidSendNode.data?.sendMode,
        text: invalidSendNode.data?.message || '',
        footer: invalidSendNode.data?.footer,
        title: invalidSendNode.data?.title,
        buttons: invalidSendNode.data?.buttons || [],
        list: invalidSendNode.data?.list || null,
        event: invalidSendNode.data?.event || null,
        externalAdReply: invalidSendNode.data?.externalAdReply || null,
        template: invalidSendNode.data?.template || null,
        product: invalidSendNode.data?.product || null,
        carousel: invalidSendNode.data?.carousel || null,
      })
      const [message] = validateButtons(payload.buttons || [])
      return res.status(400).json({ message: `${message} Fix it before publishing the workflow.` })
    }
    const invalidListNode = (existing.nodes || []).find((node) => {
      if (node.type !== 'send') return false
      const payload = sanitizeSendPayload({
        sendMode: node.data?.sendMode,
        text: node.data?.message || '',
        footer: node.data?.footer,
        title: node.data?.title,
        buttons: node.data?.buttons || [],
        list: node.data?.list || null,
        event: node.data?.event || null,
        externalAdReply: node.data?.externalAdReply || null,
        template: node.data?.template || null,
        product: node.data?.product || null,
        carousel: node.data?.carousel || null,
      })
      return validateList(payload.list).length > 0
    })
    if (invalidListNode) {
      const payload = sanitizeSendPayload({
        sendMode: invalidListNode.data?.sendMode,
        text: invalidListNode.data?.message || '',
        footer: invalidListNode.data?.footer,
        title: invalidListNode.data?.title,
        buttons: invalidListNode.data?.buttons || [],
        list: invalidListNode.data?.list || null,
        event: invalidListNode.data?.event || null,
        externalAdReply: invalidListNode.data?.externalAdReply || null,
        template: invalidListNode.data?.template || null,
        product: invalidListNode.data?.product || null,
        carousel: invalidListNode.data?.carousel || null,
      })
      const [message] = validateList(payload.list)
      return res.status(400).json({ message: `${message} Fix it before publishing the workflow.` })
    }
    const invalidEventNode = (existing.nodes || []).find((node) => {
      if (node.type !== 'send') return false
      const payload = sanitizeSendPayload({
        sendMode: node.data?.sendMode,
        text: node.data?.message || '',
        footer: node.data?.footer,
        title: node.data?.title,
        buttons: node.data?.buttons || [],
        list: node.data?.list || null,
        event: node.data?.event || null,
        externalAdReply: node.data?.externalAdReply || null,
        template: node.data?.template || null,
        product: node.data?.product || null,
        carousel: node.data?.carousel || null,
      })
      return validateEvent(payload.event).length > 0
    })
    if (invalidEventNode) {
      const payload = sanitizeSendPayload({
        sendMode: invalidEventNode.data?.sendMode,
        text: invalidEventNode.data?.message || '',
        footer: invalidEventNode.data?.footer,
        title: invalidEventNode.data?.title,
        buttons: invalidEventNode.data?.buttons || [],
        list: invalidEventNode.data?.list || null,
        event: invalidEventNode.data?.event || null,
        externalAdReply: invalidEventNode.data?.externalAdReply || null,
        template: invalidEventNode.data?.template || null,
        product: invalidEventNode.data?.product || null,
        carousel: invalidEventNode.data?.carousel || null,
      })
      const [message] = validateEvent(payload.event)
      return res.status(400).json({ message: `${message} Fix it before publishing the workflow.` })
    }
    const invalidAdTextNode = (existing.nodes || []).find((node) => {
      if (node.type !== 'send') return false
      const payload = sanitizeSendPayload({
        sendMode: node.data?.sendMode,
        text: node.data?.message || '',
        footer: node.data?.footer,
        title: node.data?.title,
        buttons: node.data?.buttons || [],
        list: node.data?.list || null,
        event: node.data?.event || null,
        externalAdReply: node.data?.externalAdReply || null,
        template: node.data?.template || null,
        product: node.data?.product || null,
        carousel: node.data?.carousel || null,
      })
      return payload.externalAdReply && !String(payload.text || '').trim()
    })
    if (invalidAdTextNode) {
      return res.status(400).json({
        message: 'A Send Message node using External Ad Reply is missing the main message text. Fix it before publishing the workflow.',
      })
    }
    const invalidAdReplyNode = (existing.nodes || []).find((node) => {
      if (node.type !== 'send') return false
      const payload = sanitizeSendPayload({
        sendMode: node.data?.sendMode,
        text: node.data?.message || '',
        footer: node.data?.footer,
        title: node.data?.title,
        buttons: node.data?.buttons || [],
        list: node.data?.list || null,
        event: node.data?.event || null,
        externalAdReply: node.data?.externalAdReply || null,
        template: node.data?.template || null,
        product: node.data?.product || null,
        carousel: node.data?.carousel || null,
      })
      return validateExternalAdReply(payload.externalAdReply).length > 0
    })
    if (invalidAdReplyNode) {
      const payload = sanitizeSendPayload({
        sendMode: invalidAdReplyNode.data?.sendMode,
        text: invalidAdReplyNode.data?.message || '',
        footer: invalidAdReplyNode.data?.footer,
        title: invalidAdReplyNode.data?.title,
        buttons: invalidAdReplyNode.data?.buttons || [],
        list: invalidAdReplyNode.data?.list || null,
        event: invalidAdReplyNode.data?.event || null,
        externalAdReply: invalidAdReplyNode.data?.externalAdReply || null,
        template: invalidAdReplyNode.data?.template || null,
        product: invalidAdReplyNode.data?.product || null,
        carousel: invalidAdReplyNode.data?.carousel || null,
      })
      const [message] = validateExternalAdReply(payload.externalAdReply)
      return res.status(400).json({ message: `${message} Fix it before publishing the workflow.` })
    }
    const invalidTemplateNode = (existing.nodes || []).find((node) => {
      if (node.type !== 'send') return false
      const payload = sanitizeSendPayload({
        sendMode: node.data?.sendMode,
        text: node.data?.message || '',
        footer: node.data?.footer,
        title: node.data?.title,
        buttons: node.data?.buttons || [],
        list: node.data?.list || null,
        event: node.data?.event || null,
        externalAdReply: node.data?.externalAdReply || null,
        template: node.data?.template || null,
        product: node.data?.product || null,
        carousel: node.data?.carousel || null,
      })
      return validateHydratedTemplate(payload.template).length > 0
    })
    if (invalidTemplateNode) {
      const payload = sanitizeSendPayload({
        sendMode: invalidTemplateNode.data?.sendMode,
        text: invalidTemplateNode.data?.message || '',
        footer: invalidTemplateNode.data?.footer,
        title: invalidTemplateNode.data?.title,
        buttons: invalidTemplateNode.data?.buttons || [],
        list: invalidTemplateNode.data?.list || null,
        event: invalidTemplateNode.data?.event || null,
        externalAdReply: invalidTemplateNode.data?.externalAdReply || null,
        template: invalidTemplateNode.data?.template || null,
        product: invalidTemplateNode.data?.product || null,
        carousel: invalidTemplateNode.data?.carousel || null,
      })
      const [message] = validateHydratedTemplate(payload.template)
      return res.status(400).json({ message: `${message} Fix it before publishing the workflow.` })
    }
    const invalidProductNode = (existing.nodes || []).find((node) => {
      if (node.type !== 'send') return false
      const payload = sanitizeSendPayload({
        sendMode: node.data?.sendMode,
        text: node.data?.message || '',
        footer: node.data?.footer,
        title: node.data?.title,
        buttons: node.data?.buttons || [],
        list: node.data?.list || null,
        event: node.data?.event || null,
        externalAdReply: node.data?.externalAdReply || null,
        template: node.data?.template || null,
        product: node.data?.product || null,
        carousel: node.data?.carousel || null,
      })
      return validateProduct(payload.product).length > 0
    })
    if (invalidProductNode) {
      const payload = sanitizeSendPayload({
        sendMode: invalidProductNode.data?.sendMode,
        text: invalidProductNode.data?.message || '',
        footer: invalidProductNode.data?.footer,
        title: invalidProductNode.data?.title,
        buttons: invalidProductNode.data?.buttons || [],
        list: invalidProductNode.data?.list || null,
        event: invalidProductNode.data?.event || null,
        externalAdReply: invalidProductNode.data?.externalAdReply || null,
        template: invalidProductNode.data?.template || null,
        product: invalidProductNode.data?.product || null,
        carousel: invalidProductNode.data?.carousel || null,
      })
      const [message] = validateProduct(payload.product)
      return res.status(400).json({ message: `${message} Fix it before publishing the workflow.` })
    }
    const invalidCarouselNode = (existing.nodes || []).find((node) => {
      if (node.type !== 'send') return false
      const payload = sanitizeSendPayload({
        sendMode: node.data?.sendMode,
        text: node.data?.message || '',
        footer: node.data?.footer,
        title: node.data?.title,
        buttons: node.data?.buttons || [],
        list: node.data?.list || null,
        event: node.data?.event || null,
        externalAdReply: node.data?.externalAdReply || null,
        template: node.data?.template || null,
        product: node.data?.product || null,
        carousel: node.data?.carousel || null,
      })
      return validateCarousel(payload.carousel).length > 0
    })
    if (invalidCarouselNode) {
      const payload = sanitizeSendPayload({
        sendMode: invalidCarouselNode.data?.sendMode,
        text: invalidCarouselNode.data?.message || '',
        footer: invalidCarouselNode.data?.footer,
        title: invalidCarouselNode.data?.title,
        buttons: invalidCarouselNode.data?.buttons || [],
        list: invalidCarouselNode.data?.list || null,
        event: invalidCarouselNode.data?.event || null,
        externalAdReply: invalidCarouselNode.data?.externalAdReply || null,
        template: invalidCarouselNode.data?.template || null,
        product: invalidCarouselNode.data?.product || null,
        carousel: invalidCarouselNode.data?.carousel || null,
      })
      const [message] = validateCarousel(payload.carousel)
      return res.status(400).json({ message: `${message} Fix it before publishing the workflow.` })
    }
    const invalidApiNode = (existing.nodes || []).find((node) => validateApiNode(node))
    if (invalidApiNode) {
      return res.status(400).json({ message: validateApiNode(invalidApiNode) })
    }
    const invalidRouterNode = (existing.nodes || []).find((node) =>
      validateRouterNode(node, existing.edges || []),
    )
    if (invalidRouterNode) {
      return res.status(400).json({ message: validateRouterNode(invalidRouterNode, existing.edges || []) })
    }
  }
  await store.setDoc(path, {
    status: publish ? 'published' : 'draft',
    boundSessionIds: req.body?.boundSessionIds || existing.boundSessionIds || [],
    updatedAt: Date.now(),
  })
  const flow = await store.getDoc(path)
  res.json({ flow })
})

// DELETE /api/flows/:id
router.delete('/:id', async (req, res) => {
  await store.deleteDoc(`${base(req.user.uid)}/${req.params.id}`)
  res.json({ ok: true })
})

module.exports = router
