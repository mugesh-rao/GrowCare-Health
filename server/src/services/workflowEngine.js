/**
 * workflowEngine — runs a user's published flows against an incoming message.
 *
 * A flow = { nodes:[{id,type,data}], edges:[{source,target,sourceHandle}] }.
 * V1 node types:
 *   trigger   — WhatsApp "message received" (entry point)
 *   condition — branch on keyword/contains (handles: "true"/"false")
 *   ai        — generate a reply with OpenAI
 *   send      — send a fixed text message
 *
 * Execution walks edges from the trigger node, producing reply strings that
 * the caller sends back over WhatsApp.
 */
const store = require('./store')
const ai = require('./aiService')
const { sanitizeSendPayload } = require('./sendPayload')

const defaultRouterRoutes = [
  { id: 'route_1', label: 'Route 1', description: '' },
  { id: 'route_2', label: 'Route 2', description: '' },
  { id: 'route_3', label: 'Route 3', description: '' },
  { id: 'route_4', label: 'Route 4', description: '' },
  { id: 'fallback', label: 'Fallback', description: 'Use this path when no route matches or confidence is low.' },
]

const nodeById = (flow, id) => flow.nodes.find((n) => n.id === id)

function nextNodes(flow, nodeId, handle) {
  const edges = Array.isArray(flow.edges) ? flow.edges : []
  const routed = edges.filter(
    (e) => e.source === nodeId && (handle == null || e.sourceHandle === handle),
  )
  const fallback = handle == null
    ? routed
    : edges.filter((e) => e.source === nodeId && !e.sourceHandle)

  return (routed.length ? routed : fallback)
    .filter((e) => e.source && e.target)
    .map((e) => nodeById(flow, e.target))
    .filter(Boolean)
}

const triggerNode = (flow) => flow.nodes.find((n) => n.type === 'trigger')

function getByPath(obj, pathStr) {
  return String(pathStr)
    .split('.')
    .reduce((acc, k) => (acc == null ? acc : acc[k]), obj)
}

function renderTemplate(template = '', ctx = {}) {
  return String(template).replace(/{{\s*([\w. -]+?)\s*}}/g, (_, rawKey) => {
    const key = rawKey.trim()
    const lower = key.toLowerCase()
    const aliases = {
      phone: ctx.phone,
      mobile: ctx.phone,
      number: ctx.phone,
      message: ctx.text,
      text: ctx.text,
      name: ctx.name,
      sessionid: ctx.sessionId,
    }
    if (aliases[lower] != null) return String(aliases[lower])
    // Dotted path into captured vars (e.g. {{api.price}}, {{cart.total}}).
    const v = getByPath(ctx.vars || {}, key)
    if (v == null) return ''
    return String(typeof v === 'object' ? JSON.stringify(v) : v)
  })
}

function normalizeMatchValue(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function buildApiHeaders(headers = [], ctx = {}) {
  return (Array.isArray(headers) ? headers : []).reduce((acc, header) => {
    const key = String(header?.key || '').trim()
    if (!key) return acc
    acc[key] = renderTemplate(header?.value || '', ctx)
    return acc
  }, {})
}

function renderEventTemplate(event, ctx = {}) {
  if (!event || typeof event !== 'object') return null
  return {
    ...event,
    name: renderTemplate(event.name || '', ctx),
    description: renderTemplate(event.description || '', ctx),
    locationName: renderTemplate(event.locationName || '', ctx),
    locationAddress: renderTemplate(event.locationAddress || '', ctx),
  }
}

function renderTemplateObject(value, ctx = {}) {
  if (typeof value === 'string') return renderTemplate(value, ctx)
  if (Array.isArray(value)) return value.map((item) => renderTemplateObject(item, ctx))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, renderTemplateObject(item, ctx)]),
    )
  }
  return value
}

function renderExternalAdReplyTemplate(adReply, ctx = {}) {
  if (!adReply || typeof adReply !== 'object') return null
  return {
    ...adReply,
    title: renderTemplate(adReply.title || '', ctx),
    body: renderTemplate(adReply.body || '', ctx),
    url: renderTemplate(adReply.url || '', ctx),
    thumbnailUrl: renderTemplate(adReply.thumbnailUrl || '', ctx),
  }
}

function getNodeRouteTargetLabel(node) {
  if (!node) return 'Unknown node'
  if (node.type === 'send') return node.data?.message || 'Send Message'
  if (node.type === 'booking') return node.data?.service || 'Booking'
  if (node.type === 'ai') return 'AI Reply'
  if (node.type === 'handoff') return 'Human Handoff'
  if (node.type === 'payment') return node.data?.label || 'Payment Link'
  if (node.type === 'catalog') return 'Send Catalog'
  if (node.type === 'api') return node.data?.url || 'API Request'
  if (node.type === 'set') return node.data?.field || 'Set Field'
  if (node.type === 'schedule') return 'Schedule Reminder'
  if (node.type === 'condition') return node.data?.keyword || 'Condition'
  if (node.type === 'router') return 'AI Router'
  return node.type || 'Node'
}

function getRouterRoutes(flow, node) {
  const configured = Array.isArray(node?.data?.routes) ? node.data.routes : []
  const routeMap = new Map(
    defaultRouterRoutes.map((route) => [route.id, { ...route }]),
  )
  configured.forEach((route) => {
    const id = String(route?.id || '').trim()
    if (!id) return
    routeMap.set(id, {
      id,
      label: String(route?.label || '').trim() || id,
      description: String(route?.description || '').trim(),
    })
  })

  const edges = (Array.isArray(flow?.edges) ? flow.edges : [])
    .filter((edge) => edge?.source === node.id && edge?.sourceHandle)
  const uniqueHandles = [...new Set(edges.map((edge) => edge.sourceHandle))]

  return uniqueHandles.map((handleId) => {
    const route = routeMap.get(handleId) || { id: handleId, label: handleId, description: '' }
    const edge = edges.find((item) => item.sourceHandle === handleId)
    const target = nodeById(flow, edge?.target)
    return {
      id: route.id,
      label: route.label || route.id,
      description: route.description || '',
      target: getNodeRouteTargetLabel(target),
    }
  })
}

async function runApiNode(data, ctx) {
  const url = renderTemplate(data.url || '', ctx).trim()
  if (!url) {
    console.error('[workflow api] skipped request: missing URL')
    return
  }

  const method = String(data.method || 'POST').toUpperCase()
  const headers = buildApiHeaders(data.headers, ctx)
  const body = renderTemplate(data.bodyTemplate || '', ctx)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const options = { method, headers, signal: controller.signal }
    if (body && !['GET', 'HEAD'].includes(method)) {
      options.body = body
    }
    const res = await fetch(url, options)
    const raw = await res.text()
    if (!res.ok) {
      console.error(`[workflow api] ${method} ${url} failed (${res.status}): ${raw.slice(0, 300)}`)
      return null
    }
    // Capture the response so later nodes can use {{<saveAs>.field}} (live DB).
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  } catch (e) {
    console.error(`[workflow api] ${method} ${url} failed:`, e.message)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/** Load a user's products (optionally filtered to specific ids/skus). */
async function loadProducts(uid, productIds) {
  if (!uid) return []
  let products = await store.listDocs(`users/${uid}/products`)
  products = products.filter((p) => p.active !== false)
  if (Array.isArray(productIds) && productIds.length) {
    const wanted = new Set(productIds)
    products = products.filter((p) => wanted.has(p.id) || wanted.has(p.sku))
  }
  return products
}

/* ------------------------------- booking --------------------------------- */
const pad2 = (n) => String(n).padStart(2, '0')

function formatSlot(date) {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Generate bookable slots from a booking node's config. */
function generateSlots(data = {}) {
  const daysAhead = Math.max(1, Number(data.daysAhead || 5))
  const startHour = Number(data.startHour ?? 9)
  const endHour = Number(data.endHour ?? 17)
  const interval = Math.max(15, Number(data.intervalMins || 30))
  const maxSlots = Math.max(1, Math.min(10, Number(data.maxSlots || 8)))
  const out = []
  const now = Date.now()
  const base = new Date()
  for (let d = 0; d < daysAhead && out.length < maxSlots; d++) {
    for (let h = startHour; h < endHour && out.length < maxSlots; h++) {
      for (let m = 0; m < 60 && out.length < maxSlots; m += interval) {
        const slot = new Date(base)
        slot.setDate(base.getDate() + d)
        slot.setHours(h, m, 0, 0)
        if (slot.getTime() <= now + 60 * 60 * 1000) continue // skip past / <1h away
        const iso = `${slot.getFullYear()}-${pad2(slot.getMonth() + 1)}-${pad2(slot.getDate())}T${pad2(slot.getHours())}:${pad2(slot.getMinutes())}`
        out.push({ id: `book_${iso}`, iso, label: formatSlot(slot) })
      }
    }
  }
  return out
}

/** Build a carousel payload from product docs. */
function productsToCarousel(products, ctx = {}) {
  return {
    cards: products
      .filter((p) => p.imageUrl || p.imageDataUrl)
      .slice(0, 10)
      .map((p) => ({
        imageUrl: p.imageUrl || '',
        imageDataUrl: p.imageDataUrl || '',
        title: p.name || 'Product',
        caption: `${p.name || ''}${p.price ? ` - ${p.currency || ''}${p.price}` : ''}`.trim(),
        buttons: p.url
          ? [{ type: 'cta_url', label: 'View', url: renderTemplate(p.url, ctx) }]
          : [{ type: 'quick_reply', label: 'Order', id: `order_${p.sku || p.id}` }],
      })),
  }
}

/** Evaluate one flow against a message. Returns { replies, handoff, attributes, schedules }. */
async function runFlow(flow, ctx) {
  const replies = []
  const attributes = {} // contact attributes to persist (CRM / cart)
  const schedules = [] // future sends (reminders)
  const bookings = [] // appointments/reservations to persist
  let handoff = null
  ctx.vars = ctx.vars || {}
  const start = triggerNode(flow)
  if (!start) return { replies, handoff, attributes, schedules, bookings }

  const visited = new Set()
  const queue = nextNodes(flow, start.id)

  while (queue.length) {
    const node = queue.shift()
    if (!node || visited.has(node.id)) continue
    visited.add(node.id)
    const data = node.data || {}

    if (node.type === 'condition') {
      const keyword = (data.keyword || '').trim().toLowerCase()
      const text = (ctx.text || '').toLowerCase()
      const normalizedKeyword = normalizeMatchValue(keyword)
      const normalizedText = normalizeMatchValue(text)
      const mode = data.matchType || 'contains'
      let matched = true
      if (keyword) {
        if (mode === 'equals') {
          matched = text === keyword || normalizedText === normalizedKeyword
        } else if (mode === 'startsWith') {
          matched =
            text.startsWith(keyword) ||
            (normalizedKeyword && normalizedText.startsWith(normalizedKeyword))
        } else {
          matched =
            text.includes(keyword) ||
            (normalizedKeyword && normalizedText.includes(normalizedKeyword))
        }
      }
      queue.push(...nextNodes(flow, node.id, matched ? 'true' : 'false'))
    } else if (node.type === 'router') {
      const routes = getRouterRoutes(flow, node)
      const fallbackRoute = String(data.fallbackRoute || 'fallback').trim() || 'fallback'
      const threshold = Math.max(0, Math.min(1, Number(data.confidenceThreshold ?? 0.55)))
      const saveAs = String(data.saveAs || 'router').trim() || 'router'
      const decision = await ai.selectRoute({
        provider: data.provider,
        apiKey: data.apiKey,
        baseURL: data.baseURL,
        model: data.model,
        systemPrompt: data.systemPrompt,
        userMessage: ctx.text,
        routes,
        contextVars: ctx.vars,
      })
      const validRouteIds = new Set(routes.map((route) => route.id))
      let chosenRoute = decision.route
      if (!chosenRoute || !validRouteIds.has(chosenRoute) || decision.confidence < threshold) {
        chosenRoute = validRouteIds.has(fallbackRoute) ? fallbackRoute : routes[0]?.id || null
      }
      ctx.vars[saveAs] = {
        route: chosenRoute,
        confidence: Number(decision.confidence || 0),
        reason: decision.reason || '',
        raw: decision.raw || '',
      }
      if (chosenRoute) queue.push(...nextNodes(flow, node.id, chosenRoute))
    } else if (node.type === 'ai') {
      const reply = await ai.generateReply({
        provider: data.provider,
        apiKey: data.apiKey,
        baseURL: data.baseURL,
        model: data.model,
        systemPrompt: data.systemPrompt,
        userMessage: ctx.text,
        temperature: data.temperature,
      })
      replies.push(reply)
      queue.push(...nextNodes(flow, node.id))
    } else if (node.type === 'send') {
      // Catalog mode: render the merchant's products as a scrollable carousel.
      let carousel = renderTemplateObject(data.carousel || null, ctx)
      let sendMode = data.sendMode
      if (data.sendMode === 'catalog') {
        const products = await loadProducts(ctx.uid, data.productIds)
        carousel = products.length ? productsToCarousel(products, ctx) : null
        sendMode = carousel?.cards?.length ? 'carousel' : 'text'
      }
      const sendPayload = sanitizeSendPayload({
        sendMode,
        text: renderTemplate(data.message || '', ctx),
        footer: data.footer,
        title: data.title,
        buttons: data.buttons || [],
        list: data.list || null,
        event: renderEventTemplate(data.event, ctx),
        externalAdReply: renderExternalAdReplyTemplate(data.externalAdReply, ctx),
        template: renderTemplateObject(data.template || null, ctx),
        product: renderTemplateObject(data.product || null, ctx),
        carousel,
      })
      if (
        sendPayload.text ||
        (sendPayload.buttons && sendPayload.buttons.length) ||
        sendPayload.list ||
        sendPayload.event ||
        sendPayload.externalAdReply ||
        sendPayload.template ||
        sendPayload.product ||
        sendPayload.carousel
      ) {
        replies.push(sendPayload)
      }
      queue.push(...nextNodes(flow, node.id))
    } else if (node.type === 'catalog') {
      // Send the merchant's products as a scrollable carousel.
      const products = await loadProducts(ctx.uid, data.productIds)
      const carousel = products.length ? productsToCarousel(products, ctx) : null
      if (carousel?.cards?.length) {
        replies.push(
          sanitizeSendPayload({
            sendMode: 'carousel',
            text: renderTemplate(data.message || '', ctx) || 'Here are our products 👇',
            carousel,
          }),
        )
      } else if (products.length) {
        replies.push(
          sanitizeSendPayload({
            sendMode: 'text',
            text: products
              .slice(0, 10)
              .map((p) => `${p.name || 'Product'}${p.price ? ` - ${p.currency || ''}${p.price}` : ''}${p.url ? `\n${p.url}` : ''}`)
              .join('\n\n'),
          }),
        )
      }
      queue.push(...nextNodes(flow, node.id))
    } else if (node.type === 'api') {
      const result = await runApiNode(data, ctx)
      ctx.vars[(data.saveAs || 'api').trim()] = result
      queue.push(...nextNodes(flow, node.id))
    } else if (node.type === 'set') {
      // Set a contact attribute (CRM / cart capture); also usable in templates.
      const field = String(data.field || '').trim()
      if (field) {
        const value = renderTemplate(data.value || '', ctx)
        ctx.vars[field] = value
        attributes[field] = value
      }
      queue.push(...nextNodes(flow, node.id))
    } else if (node.type === 'schedule') {
      // Queue a future message (reminder / follow-up).
      const seconds = Math.max(0, Number(data.seconds || 0))
      const msg = renderTemplate(data.message || '', ctx)
      if (msg) schedules.push({ runAt: Date.now() + seconds * 1000, payload: { text: msg } })
      queue.push(...nextNodes(flow, node.id))
    } else if (node.type === 'booking') {
      const service = data.service || 'appointment'
      const pick = (ctx.text || '').match(/book_([0-9T:-]+)/)
      if (pick) {
        // The customer picked a slot → confirm, store, schedule a reminder.
        const iso = pick[1]
        const dt = new Date(iso)
        const label = isNaN(dt.getTime()) ? iso : formatSlot(dt)
        bookings.push({ service, slotIso: iso, slotLabel: label, phone: ctx.phone, name: ctx.name })
        ctx.vars.slot = label
        const confirm = data.confirmMessage
          ? renderTemplate(data.confirmMessage, ctx)
          : `Booked! Your ${service} is confirmed for ${label}.`
        replies.push(sanitizeSendPayload({ sendMode: 'text', text: confirm }))
        const remindMs = dt.getTime() - Number(data.reminderHours ?? 24) * 3_600_000
        if (!isNaN(remindMs) && remindMs > Date.now() + 60_000) {
          schedules.push({
            runAt: remindMs,
            payload: { text: `Reminder: your ${service} is at ${label}.` },
          })
        }
        queue.push(...nextNodes(flow, node.id))
      } else {
        // Offer slots as a list and wait for the pick (no continue).
        const slots = generateSlots(data)
        if (slots.length) {
          replies.push(
            sanitizeSendPayload({
              sendMode: 'list',
              text: renderTemplate(data.message || `Pick a time for your ${service}:`, ctx),
              list: {
                buttonText: data.buttonText || 'Choose a time',
                sections: [{ title: 'Available slots', rows: slots.map((s) => ({ id: s.id, title: s.label })) }],
              },
            }),
          )
        }
      }
    } else if (node.type === 'payment') {
      const url = renderTemplate(data.linkTemplate || data.url || '', ctx).trim()
      if (url) {
        replies.push(
          sanitizeSendPayload({
            sendMode: 'buttons',
            text: renderTemplate(data.message || 'Complete your payment below 👇', ctx),
            footer: data.amount ? `Amount: ${data.currency || '₹'}${data.amount}` : '',
            buttons: [{ type: 'cta_url', label: data.label || 'Pay now', url }],
          }),
        )
      }
      queue.push(...nextNodes(flow, node.id))
    } else if (node.type === 'handoff') {
      // Hand the conversation to a human and stop automation for this contact.
      handoff = {
        reason: data.reason || 'manual',
        note: data.note || '',
        assignee: data.assignee || '',
        status: 'pending',
      }
      break
    } else if (node.type === 'delay') {
      // Delay is metadata for the runtime; engine just continues the path.
      queue.push(...nextNodes(flow, node.id))
    } else {
      queue.push(...nextNodes(flow, node.id))
    }
  }
  return { replies, handoff, attributes, schedules, bookings }
}

/**
 * Handle an incoming message: find the user's published flows bound to this
 * session, run them, and return the reply strings to send.
 */
async function handleIncoming({ uid, sessionId, text, phone, name }) {
  const flows = await store.listDocs(`users/${uid}/flows`, [
    ['status', '==', 'published'],
  ])

  const replies = []
  const attributes = {}
  const schedules = []
  const bookings = []
  let handoff = null
  for (const flow of flows) {
    const bound = flow.boundSessionIds
    if (Array.isArray(bound) && bound.length && !bound.includes(sessionId)) {
      continue // flow is scoped to other numbers
    }
    if (!flow.nodes || !flow.edges) continue
    const out = await runFlow(flow, { uid, text, sessionId, phone, name, vars: {} })
    replies.push(...out.replies)
    Object.assign(attributes, out.attributes || {})
    if (out.schedules) schedules.push(...out.schedules)
    if (out.bookings) bookings.push(...out.bookings)
    if (out.handoff && !handoff) handoff = out.handoff
  }
  return { replies, handoff, attributes, schedules, bookings }
}

module.exports = { handleIncoming, runFlow }
