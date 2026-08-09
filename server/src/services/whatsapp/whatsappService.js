/**
 * whatsappService — manages Baileys sessions (PRD §6).
 *
 *  • In-memory registry of live sockets, keyed by `${uid}:${sessionId}`.
 *  • Auth state persisted to the store (Firestore/file) so sessions survive
 *    restarts and reconnect automatically (no QR re-scan).
 *  • Emits qr / status / message events to the client over the realtime hub.
 *  • On incoming messages, runs the user's published workflows and replies.
 *
 * Baileys is ESM-only, so it's loaded via dynamic import.
 */
const store = require('../core/store')
const realtime = require('../core/realtime')
const antiBan = require('./antiBan')
const { useStoreAuthState } = require('./waAuthState')
const workflowEngine = require('../workflow/engine')
const {
  buildHydratedButtons,
  buildProductPayload,
  validateCarousel,
  validateHydratedTemplate,
  validateProduct,
} = require('./advancedMessages')
const { buildInteractiveButtons, validateButtons } = require('./buttons')
const { buildExternalAdReply, validateExternalAdReply } = require('./externalAdReply')
const { buildEventMessage, validateEvent } = require('./events')
const { buildListMessage, validateList } = require('./lists')
const { buildImageUpload, hasValue } = require('./mediaInput')
const { sanitizeSendPayload } = require('./sendPayload')

function getInteractiveRelayNode(message) {
  const nativeFlow = message.interactiveMessage?.nativeFlowMessage
  const carousel = message.interactiveMessage?.carouselMessage
  const firstButtonName = nativeFlow?.buttons?.[0]?.name
  const nativeFlowSpecials = [
    'mpm',
    'cta_catalog',
    'send_location',
    'call_permission_request',
    'wa_payment_transaction_details',
    'automated_greeting_message_view_catalog',
  ]

  if (nativeFlow && (firstButtonName === 'review_and_pay' || firstButtonName === 'payment_info')) {
    return {
      tag: 'biz',
      attrs: {
        native_flow_name: firstButtonName === 'review_and_pay' ? 'order_details' : firstButtonName,
      },
    }
  }

  if (nativeFlow && nativeFlowSpecials.includes(firstButtonName)) {
    return {
      tag: 'biz',
      attrs: {},
      content: [
        {
          tag: 'interactive',
          attrs: { type: 'native_flow', v: '1' },
          content: [
            {
              tag: 'native_flow',
              attrs: { v: '2', name: firstButtonName },
            },
          ],
        },
      ],
    }
  }

  if (nativeFlow || carousel || message.buttonsMessage || message.interactiveMessage) {
    return {
      tag: 'biz',
      attrs: {},
      content: [
        {
          tag: 'interactive',
          attrs: { type: 'native_flow', v: '1' },
          content: [
            {
              tag: 'native_flow',
              attrs: { v: '9', name: 'mixed' },
            },
          ],
        },
      ],
    }
  }

  if (message.listMessage) {
    return {
      tag: 'biz',
      attrs: {},
      content: [
        {
          tag: 'list',
          attrs: { v: '2', type: 'product_list' },
        },
      ],
    }
  }

  return { tag: 'biz', attrs: {} }
}

async function prepareImageMessage(sock, imageUrl, imageDataUrl, caption) {
  if (!hasValue(imageUrl) && !hasValue(imageDataUrl)) return null
  const bln = await getBaileys()
  const { prepareWAMessageMedia } = bln
  const media = await prepareWAMessageMedia(
    {
      image: buildImageUpload({ url: imageUrl, dataUrl: imageDataUrl }),
      ...(hasValue(caption) && { caption: String(caption).trim() }),
    },
    {
      upload: sock.waUploadToServer,
      mediaCache: sock.mediaCache,
      options: sock.ws?.config?.options,
      logger: sock.logger,
    },
  )
  return media.imageMessage
}

async function sendRawContent(sock, jid, content) {
  const bln = await getBaileys()
  const {
    generateWAMessageFromContent,
    generateMessageIDV2,
    normalizeMessageContent,
    isJidGroup,
  } = bln
  const userJid = sock.authState?.creds?.me?.id || sock.user?.id
  const fullMsg = generateWAMessageFromContent(jid, content, {
    logger: sock.logger,
    userJid,
    messageId: generateMessageIDV2(userJid),
    timestamp: new Date(),
  })
  const normalizedContent = normalizeMessageContent(fullMsg.message)
  const additionalNodes = [getInteractiveRelayNode(normalizedContent)]
  if (!isJidGroup(jid)) {
    additionalNodes.push({ tag: 'bot', attrs: { biz_bot: '1' } })
  }
  await sock.relayMessage(jid, fullMsg.message, {
    messageId: fullMsg.key.id,
    additionalAttributes: {},
    additionalNodes,
  })
}

async function sendHydratedTemplate(sock, jid, template) {
  const imageMessage = await prepareImageMessage(
    sock,
    template.imageUrl,
    template.imageDataUrl,
    template.title,
  )
  const content = {
    templateMessage: {
      hydratedTemplate: {
        hydratedContentText: String(template.text || '').trim(),
        hydratedFooterText: String(template.footer || '').trim() || undefined,
        hydratedButtons: buildHydratedButtons(template.buttons || []),
        hydratedTitleText: imageMessage ? undefined : String(template.title || '').trim() || undefined,
        imageMessage: imageMessage || undefined,
      },
    },
  }
  await sendRawContent(sock, jid, content)
}

async function sendCarousel(sock, jid, { text = '', footer = '', carousel }) {
  const cards = []
  for (const card of carousel.cards || []) {
    const headerImage = await prepareImageMessage(
      sock,
      card.imageUrl,
      card.imageDataUrl,
      '',
    )
    cards.push({
      header: headerImage
        ? {
            hasMediaAttachment: true,
            imageMessage: headerImage,
          }
        : undefined,
      body: { text: String(card.caption || card.title || '').trim() },
      footer: String(card.footer || '').trim() ? { text: String(card.footer).trim() } : undefined,
      nativeFlowMessage: {
        buttons: buildInteractiveButtons(card.buttons || []),
      },
    })
  }

  const content = {
    interactiveMessage: {
      body: { text: String(text || '').trim() || 'Carousel' },
      footer: String(footer || '').trim() ? { text: String(footer).trim() } : undefined,
      carouselMessage: {
        cards,
        messageVersion: 1,
        carouselCardType: 1,
      },
    },
  }
  await sendRawContent(sock, jid, content)
}

async function sendInteractiveButtons(sock, jid, { text = '', footer, title, interactiveButtons }) {
  const bln = await getBaileys()
  const {
    generateWAMessageFromContent,
    generateMessageIDV2,
    normalizeMessageContent,
    isJidGroup,
  } = bln

  const content = {
    interactiveMessage: {
      nativeFlowMessage: {
        buttons: interactiveButtons,
      },
    },
  }

  if (String(title || '').trim()) {
    content.interactiveMessage.header = { title }
  }
  if (String(text).trim()) {
    content.interactiveMessage.body = { text }
  }
  if (String(footer || '').trim()) {
    content.interactiveMessage.footer = { text: footer }
  }

  const userJid = sock.authState?.creds?.me?.id || sock.user?.id
  const fullMsg = generateWAMessageFromContent(jid, content, {
    logger: sock.logger,
    userJid,
    messageId: generateMessageIDV2(userJid),
    timestamp: new Date(),
  })

  const normalizedContent = normalizeMessageContent(fullMsg.message)
  const additionalNodes = [getInteractiveRelayNode(normalizedContent)]

  if (!isJidGroup(jid)) {
    additionalNodes.push({ tag: 'bot', attrs: { biz_bot: '1' } })
  }

  await sock.relayMessage(jid, fullMsg.message, {
    messageId: fullMsg.key.id,
    additionalAttributes: {},
    additionalNodes,
  })
}

/**
 * protectedSend — anti-ban wrapper around sendOutgoing.
 * Applies spintax, asks the anti-ban engine to gate + pace the send, performs
 * the send, and records the result for warm-up / rate-limit / health tracking.
 * Proactive sends (manual + bulk) are blocked when over the safe limit; auto-
 * replies are paced but never blocked.
 */
async function protectedSend(uid, sessionId, sock, jid, payload, { proactive } = {}) {
  const cfg = await antiBan.getConfig(uid)
  let p = typeof payload === 'string' ? { text: payload } : { ...(payload || {}) }
  if (cfg.enabled && cfg.spintax) {
    if (typeof p.text === 'string') p.text = antiBan.applySpintax(p.text)
    if (typeof p.footer === 'string') p.footer = antiBan.applySpintax(p.footer)
  }
  if (cfg.enabled) {
    await antiBan.gate(uid, sessionId, sock, jid, p.text || '', { proactive, cfg })
  }
  try {
    await sendOutgoing(sock, jid, p)
    if (cfg.enabled) antiBan.afterSend(uid, sessionId, jid, p.text || '')
  } catch (e) {
    if (cfg.enabled) antiBan.afterFailed(uid, sessionId, e.message)
    throw e
  }
}

/**
 * Send a message that may include interactive buttons. `payload` is either a
 * string or { text, footer, title, buttons }.
 */
async function sendOutgoing(sock, jid, payload) {
  const content =
    typeof payload === 'string' ? sanitizeSendPayload({ text: payload }) : sanitizeSendPayload(payload || {})

  const { text = '', footer, title } = content
  const buttons = Array.isArray(content.buttons) ? content.buttons : []
  const interactiveButtons = buildInteractiveButtons(buttons)
  const list = content.list
  const event = content.event
  const externalAdReply = content.externalAdReply
  const template = content.template
  const product = content.product
  const carousel = content.carousel

  if ([interactiveButtons.length > 0, Boolean(list), Boolean(event), Boolean(externalAdReply), Boolean(template), Boolean(product), Boolean(carousel)].filter(Boolean).length > 1) {
    throw new Error('Choose only one interactive type per send step.')
  }

  if (interactiveButtons.length) {
    const errors = validateButtons(buttons)
    if (errors.length) throw new Error(errors[0])
    try {
      await sendInteractiveButtons(sock, jid, { text, footer, title, interactiveButtons })
      return
    } catch (e) {
      console.error('[wa] interactive send failed:', e.message)
      throw new Error(`Interactive buttons failed: ${e.message}`)
    }
  }
  if (list) {
    const errors = validateList(list)
    if (errors.length) throw new Error(errors[0])
    try {
      const bln = await getBaileys()
      const {
        generateWAMessageFromContent,
        generateMessageIDV2,
        normalizeMessageContent,
        isJidGroup,
      } = bln
      const userJid = sock.authState?.creds?.me?.id || sock.user?.id
      const fullMsg = generateWAMessageFromContent(jid, buildListMessage(text, footer, list), {
        logger: sock.logger,
        userJid,
        messageId: generateMessageIDV2(userJid),
        timestamp: new Date(),
      })
      const normalizedContent = normalizeMessageContent(fullMsg.message)
      const additionalNodes = [getInteractiveRelayNode(normalizedContent)]
      if (!isJidGroup(jid)) {
        additionalNodes.push({ tag: 'bot', attrs: { biz_bot: '1' } })
      }
      await sock.relayMessage(jid, fullMsg.message, {
        messageId: fullMsg.key.id,
        additionalAttributes: {},
        additionalNodes,
      })
      return
    } catch (e) {
      console.error('[wa] list send failed:', e.message)
      throw new Error(`List message failed: ${e.message}`)
    }
  }
  if (event) {
    const errors = validateEvent(event)
    if (errors.length) throw new Error(errors[0])
    try {
      await sock.sendMessage(jid, { event: buildEventMessage(event) })
      return
    } catch (e) {
      console.error('[wa] event send failed:', e.message)
      throw new Error(`Event message failed: ${e.message}`)
    }
  }
  if (externalAdReply) {
    const errors = validateExternalAdReply(externalAdReply)
    if (errors.length) throw new Error(errors[0])
    if (!String(text || '').trim()) {
      throw new Error('External ad reply message text is required.')
    }
    try {
      await sock.sendMessage(jid, {
        text,
        contextInfo: {
          externalAdReply: await buildExternalAdReply(externalAdReply),
        },
      })
      return
    } catch (e) {
      console.error('[wa] external ad reply send failed:', e.message)
      throw new Error(`External ad reply failed: ${e.message}`)
    }
  }
  if (template) {
    const errors = validateHydratedTemplate(template)
    if (errors.length) throw new Error(errors[0])
    try {
      await sendHydratedTemplate(sock, jid, template)
      return
    } catch (e) {
      console.error('[wa] hydrated template send failed:', e.message)
      throw new Error(`Hydrated template failed: ${e.message}`)
    }
  }
  if (product) {
    const errors = validateProduct(product)
    if (errors.length) throw new Error(errors[0])
    try {
      await sock.sendMessage(jid, buildProductPayload(product))
      return
    } catch (e) {
      console.error('[wa] product send failed:', e.message)
      throw new Error(`Product message failed: ${e.message}`)
    }
  }
  if (carousel) {
    const errors = validateCarousel(carousel)
    if (errors.length) throw new Error(errors[0])
    try {
      await sendCarousel(sock, jid, { text, footer, carousel })
      return
    } catch (e) {
      console.error('[wa] carousel send failed:', e.message)
      throw new Error(`Carousel message failed: ${e.message}`)
    }
  }
  await sock.sendMessage(jid, { text })
}

let baileys = null
async function getBaileys() {
  if (!baileys) baileys = await import('@whiskeysockets/baileys')
  return baileys
}

/** Build an HTTP(S)/SOCKS proxy agent from a proxy URL (anti-ban: per-number IP). */
function buildProxyAgent(proxyUrl) {
  if (!proxyUrl || !String(proxyUrl).trim()) return null
  const url = String(proxyUrl).trim()
  try {
    if (url.startsWith('socks')) {
      const { SocksProxyAgent } = require('socks-proxy-agent')
      return new SocksProxyAgent(url)
    }
    const { HttpsProxyAgent } = require('https-proxy-agent')
    return new HttpsProxyAgent(url)
  } catch (e) {
    console.error('[wa] invalid proxy, ignoring:', e.message)
    return null
  }
}

let logger = null
async function getLogger() {
  if (logger) return logger
  const pino = (await import('pino')).default
  logger = pino({ level: 'silent' })
  return logger
}

// Registry: key -> { sock, status, qr }
const registry = new Map()
const key = (uid, sessionId) => `${uid}:${sessionId}`

function setEntry(uid, sessionId, patch) {
  const k = key(uid, sessionId)
  const cur = registry.get(k) || {}
  registry.set(k, { ...cur, ...patch })
}

function getEntry(uid, sessionId) {
  return registry.get(key(uid, sessionId))
}

async function persistStatus(uid, sessionId, status, extra = {}) {
  await store.setDoc(`users/${uid}/sessions/${sessionId}`, {
    status,
    updatedAt: Date.now(),
    ...extra,
  })
  realtime.emitToUser(uid, { type: 'status', sessionId, status })
}

/**
 * Start (or restart) a Baileys socket for a session.
 * @returns {Promise<{sessionId}>}
 */
async function startSession(uid, sessionId, { label, force } = {}) {
  // Guard: if a live socket already exists for this session, don't spin up a
  // duplicate. A connected/connecting socket is left alone (no re-pairing).
  const live = getEntry(uid, sessionId)
  if (!force && live?.sock && (live.status === 'connected' || live.status === 'connecting')) {
    return { sessionId }
  }

  const bln = await getBaileys()
  const { makeWASocket, fetchLatestBaileysVersion, DisconnectReason } = bln
  const Boom = (await import('@hapi/boom')).Boom

  // Ensure a session doc exists.
  const existing = await store.getDoc(`users/${uid}/sessions/${sessionId}`)
  if (!existing) {
    await store.setDoc(`users/${uid}/sessions/${sessionId}`, {
      label: label || 'WhatsApp',
      status: 'connecting',
      createdAt: Date.now(),
    })
  }

  const { state, saveCreds } = await useStoreAuthState(bln, uid, sessionId)
  const { version } = await fetchLatestBaileysVersion()

  // Optional per-session proxy (anti-ban): each number can route over its own IP.
  const agent = buildProxyAgent(existing?.proxyUrl)

  const sock = makeWASocket({
    version,
    auth: state,
    logger: await getLogger(),
    printQRInTerminal: false,
    browser: ['Growto', 'Chrome', '1.0.0'],
    syncFullHistory: false,
    ...(agent && { agent, fetchAgent: agent }),
  })

  setEntry(uid, sessionId, { sock, status: 'connecting', qr: null })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      setEntry(uid, sessionId, { qr, status: 'qr' })
      realtime.emitToUser(uid, { type: 'qr', sessionId, qr })
      await persistStatus(uid, sessionId, 'qr')
    }

    if (connection === 'open') {
      const phone = sock.user?.id?.split(':')[0]?.split('@')[0]
      setEntry(uid, sessionId, { status: 'connected', qr: null })
      await persistStatus(uid, sessionId, 'connected', {
        phone: phone || null,
        lastConnectedAt: Date.now(),
      })
      // Anti-ban: spin up (or rehydrate) this number's safety instance.
      antiBan.ensureInstance(uid, sessionId).catch(() => {})
      antiBan.onReconnect(uid, sessionId)
    }

    if (connection === 'close') {
      const statusCode =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : lastDisconnect?.error?.output?.statusCode
      const loggedOut = statusCode === DisconnectReason.loggedOut

      // Feed the disconnect to the anti-ban health monitor.
      antiBan.onDisconnect(uid, sessionId, statusCode)

      if (loggedOut) {
        // Session is truly invalid — only now do we require a fresh QR.
        await persistStatus(uid, sessionId, 'logged_out')
        antiBan.dropInstance(uid, sessionId).catch(() => {})
        registry.delete(key(uid, sessionId))
      } else {
        // Transient drop — reconnect silently using the stored creds (no QR).
        setEntry(uid, sessionId, { sock: null, status: 'reconnecting' })
        await persistStatus(uid, sessionId, 'reconnecting')
        setTimeout(() => {
          startSession(uid, sessionId).catch((e) =>
            console.error('[wa] reconnect failed', e.message),
          )
        }, 3000)
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      try {
        await onIncomingMessage(uid, sessionId, sock, msg)
      } catch (e) {
        console.error('[wa] message handler error:', e.message)
      }
    }
  })

  return { sessionId }
}

function parseInteractiveParams(paramsJson) {
  if (!paramsJson) return ''
  try {
    const parsed = JSON.parse(paramsJson)
    return (
      parsed?.selectedRowId ||
      parsed?.selected_row_id ||
      parsed?.selectedButtonId ||
      parsed?.selected_button_id ||
      parsed?.id ||
      parsed?.title ||
      parsed?.text ||
      ''
    )
  } catch {
    return paramsJson
  }
}

const textFromMessage = (msg) =>
  msg.message?.conversation ||
  msg.message?.extendedTextMessage?.text ||
  msg.message?.buttonsResponseMessage?.selectedButtonId ||
  msg.message?.buttonsResponseMessage?.selectedDisplayText ||
  msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
  msg.message?.listResponseMessage?.title ||
  msg.message?.templateButtonReplyMessage?.selectedId ||
  msg.message?.templateButtonReplyMessage?.selectedDisplayText ||
  msg.message?.interactiveResponseMessage?.body?.text ||
  parseInteractiveParams(msg.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) ||
  msg.message?.imageMessage?.caption ||
  msg.message?.videoMessage?.caption ||
  ''

async function onIncomingMessage(uid, sessionId, sock, msg) {
  if (!msg.message || msg.key.fromMe) return
  const jid = msg.key.remoteJid
  if (!jid || jid === 'status@broadcast' || jid.endsWith('@g.us')) return // skip status & groups in V1

  const text = textFromMessage(msg)
  if (!text) return

  const phone = jid.split('@')[0]
  const name = msg.pushName || phone
  const messageId = msg.key.id || store.genId()
  const now = Date.now()
  const contactPath = `users/${uid}/contacts/${phone}`
  const contact = (await store.getDoc(contactPath)) || {}

  // Persist inbound message + update the conversation, notify client.
  await store.setDoc(contactPath, {
    phone,
    name: contact.name && contact.name !== phone ? contact.name : name,
    sessionId,
    lastSeen: now,
    lastMessage: text,
    lastMessageAt: now,
    lastDirection: 'in',
    unread: (contact.unread || 0) + 1,
    status: contact.status === 'closed' ? 'open' : contact.status || 'open',
  })
  await store.setDoc(`users/${uid}/messages/${messageId}`, {
    sessionId,
    contactId: phone,
    direction: 'in',
    body: text,
    timestamp: now,
  })
  realtime.emitToUser(uid, {
    type: 'message',
    sessionId,
    message: { contactId: phone, direction: 'in', body: text, timestamp: now },
  })
  realtime.emitToUser(uid, { type: 'conversation', contactId: phone })

  // If a human has taken over this chat, the bot stays silent.
  if (contact.botPaused) return

  // Run published workflows → replies + optional human handoff.
  const { replies, handoff, attributes, schedules, bookings } = await workflowEngine.handleIncoming({
    uid,
    sessionId,
    text,
    phone,
    name,
  })
  for (const reply of replies) {
    // Auto-replies are paced (typing + delay + spintax) but never blocked.
    await protectedSend(uid, sessionId, sock, jid, reply, { proactive: false })
    const body = typeof reply === 'string' ? reply : reply.text || ''
    const outId = store.genId()
    await store.setDoc(`users/${uid}/messages/${outId}`, {
      sessionId,
      contactId: phone,
      direction: 'out',
      body,
      timestamp: Date.now(),
    })
    await store.setDoc(contactPath, {
      lastMessage: body,
      lastMessageAt: Date.now(),
      lastDirection: 'out',
    })
    realtime.emitToUser(uid, {
      type: 'message',
      sessionId,
      message: { contactId: phone, direction: 'out', body, timestamp: Date.now() },
    })
  }

  // Persist any contact attributes the workflow captured (CRM / cart).
  if (attributes && Object.keys(attributes).length) {
    await store.setDoc(contactPath, {
      attributes: { ...(contact.attributes || {}), ...attributes },
    })
    realtime.emitToUser(uid, { type: 'conversation', contactId: phone })
  }

  // Persist any bookings (appointments / reservations / site visits).
  if (bookings && bookings.length) {
    for (const b of bookings) {
      const bid = store.genId()
      await store.setDoc(`users/${uid}/bookings/${bid}`, {
        ...b,
        sessionId,
        status: 'booked',
        createdAt: Date.now(),
      })
    }
    realtime.emitToUser(uid, { type: 'booking', contactId: phone })
  }

  // Queue any scheduled reminders the workflow requested.
  if (schedules && schedules.length) {
    const scheduler = require('./scheduler')
    for (const s of schedules) {
      await scheduler.schedule(uid, {
        sessionId,
        to: phone,
        payload: s.payload,
        runAt: s.runAt,
      })
    }
  }

  // Apply a human handoff if a workflow requested one.
  if (handoff) {
    await store.setDoc(contactPath, {
      botPaused: true,
      status: handoff.status || 'pending',
      assignee: handoff.assignee || contact.assignee || '',
      handoffReason: handoff.reason || 'manual',
      handoffAt: Date.now(),
    })
    if (handoff.note) {
      await store.setDoc(`users/${uid}/contacts/${phone}/notes/${store.genId()}`, {
        body: handoff.note,
        author: 'system',
        createdAt: Date.now(),
      })
    }
    realtime.emitToUser(uid, { type: 'handoff', contactId: phone, reason: handoff.reason })
    realtime.emitToUser(uid, { type: 'conversation', contactId: phone })
  }
}

/**
 * Send a message manually / from bulk. `payload` is a string or
 * { text, footer, title, buttons }.
 */
async function sendMessage(uid, sessionId, to, payload) {
  const entry = getEntry(uid, sessionId)
  if (!entry || entry.status !== 'connected' || !entry.sock) {
    throw new Error('This WhatsApp number is not connected.')
  }
  const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`
  // Proactive send → anti-ban gate enforces the per-number safe-send limit.
  await protectedSend(uid, sessionId, entry.sock, jid, payload, { proactive: true })
  return { to: jid }
}

/** List a user's sessions (status comes from the live registry when present). */
async function listSessions(uid) {
  const docs = await store.listDocs(`users/${uid}/sessions`)
  const cfg = await antiBan.getConfig(uid)
  return Promise.all(
    docs.map(async (d) => {
      const entry = getEntry(uid, d.id)
      const status = entry?.status || d.status || 'disconnected'
      // Ensure a safety instance exists for connected numbers so health is live.
      if (status === 'connected') await antiBan.ensureInstance(uid, d.id).catch(() => {})
      return {
        id: d.id,
        label: d.label,
        phone: d.phone || null,
        status,
        lastConnectedAt: d.lastConnectedAt || null,
        proxyUrl: d.proxyUrl || '',
        health: antiBan.getHealth(uid, d.id, cfg),
      }
    }),
  )
}

/** Set/clear a per-session proxy and restart the socket to apply it. */
async function setProxy(uid, sessionId, proxyUrl) {
  await store.setDoc(`users/${uid}/sessions/${sessionId}`, { proxyUrl: proxyUrl || '' })
  // Restart the socket so the new agent takes effect.
  const entry = getEntry(uid, sessionId)
  if (entry?.sock) {
    try {
      entry.sock.end?.()
    } catch {
      /* ignore */
    }
    registry.delete(key(uid, sessionId))
  }
  await startSession(uid, sessionId, { force: true })
  return { ok: true }
}

async function logoutSession(uid, sessionId) {
  const entry = getEntry(uid, sessionId)
  try {
    if (entry?.sock) await entry.sock.logout()
  } catch {
    /* ignore */
  }
  await antiBan.dropInstance(uid, sessionId).catch(() => {})
  registry.delete(key(uid, sessionId))
  await persistStatus(uid, sessionId, 'logged_out')
}

async function deleteSession(uid, sessionId) {
  await logoutSession(uid, sessionId).catch(() => {})
  await store.deleteDoc(`users/${uid}/sessions/${sessionId}`)
}

/** Reconnect every persisted session on server boot. */
async function bootReconnect() {
  antiBan.startAutoFlush() // periodically persist warm-up state
  try {
    const sessions = await store.listAllSessions()
    const reconnectable = sessions.filter((s) => s.status !== 'logged_out')
    if (!reconnectable.length) return
    console.log(`[wa] rehydrating ${reconnectable.length} session(s)…`)
    // Stagger reconnects so many numbers (across many users) don't all open
    // sockets at the same instant — keeps every session connected reliably.
    reconnectable.forEach((s, i) => {
      setTimeout(() => {
        startSession(s.uid, s.sessionId).catch((e) =>
          console.error(`[wa] boot reconnect ${s.sessionId} failed:`, e.message),
        )
      }, i * 800)
    })
  } catch (e) {
    console.error('[wa] bootReconnect error:', e.message)
  }
}

module.exports = {
  startSession,
  sendMessage,
  listSessions,
  setProxy,
  logoutSession,
  deleteSession,
  bootReconnect,
  getEntry,
}
