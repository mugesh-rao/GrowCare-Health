export function inferSendMode(payload = {}) {
  const explicit = String(payload.sendMode || '').trim()
  if (['text', 'buttons', 'list', 'event', 'ad', 'template', 'product', 'carousel'].includes(explicit)) return explicit
  if (payload.carousel) return 'carousel'
  if (payload.product) return 'product'
  if (payload.template) return 'template'
  if (payload.externalAdReply) return 'ad'
  if (payload.event) return 'event'
  if (payload.list) return 'list'
  if (Array.isArray(payload.buttons) && payload.buttons.length) return 'buttons'
  return 'text'
}

export function sanitizeSendPayload(payload = {}) {
  const sendMode = inferSendMode(payload)
  const sanitized = {
    sendMode,
    text: String(payload.text || ''),
    footer: String(payload.footer || ''),
    title: String(payload.title || ''),
    buttons: Array.isArray(payload.buttons) ? payload.buttons : [],
    list: payload.list || null,
    event: payload.event || null,
    externalAdReply: payload.externalAdReply || null,
    template: payload.template || null,
    product: payload.product || null,
    carousel: payload.carousel || null,
  }

  if (sendMode === 'event') {
    return {
      sendMode,
      text: '',
      footer: '',
      title: '',
      buttons: [],
      list: null,
      event: sanitized.event,
      externalAdReply: null,
      template: null,
      product: null,
      carousel: null,
    }
  }

  if (sendMode === 'list') {
    return {
      sendMode,
      text: sanitized.text,
      footer: sanitized.footer,
      title: sanitized.title,
      buttons: [],
      list: sanitized.list,
      event: null,
      externalAdReply: null,
      template: null,
      product: null,
      carousel: null,
    }
  }

  if (sendMode === 'buttons') {
    return {
      sendMode,
      text: sanitized.text,
      footer: sanitized.footer,
      title: sanitized.title,
      buttons: sanitized.buttons,
      list: null,
      event: null,
      externalAdReply: null,
      template: null,
      product: null,
      carousel: null,
    }
  }

  if (sendMode === 'ad') {
    return {
      sendMode,
      text: sanitized.text,
      footer: '',
      title: '',
      buttons: [],
      list: null,
      event: null,
      externalAdReply: sanitized.externalAdReply,
      template: null,
      product: null,
      carousel: null,
    }
  }

  if (sendMode === 'template') {
    return {
      sendMode,
      text: '',
      footer: '',
      title: '',
      buttons: [],
      list: null,
      event: null,
      externalAdReply: null,
      template: sanitized.template,
      product: null,
      carousel: null,
    }
  }

  if (sendMode === 'product') {
    return {
      sendMode,
      text: '',
      footer: '',
      title: '',
      buttons: [],
      list: null,
      event: null,
      externalAdReply: null,
      template: null,
      product: sanitized.product,
      carousel: null,
    }
  }

  if (sendMode === 'carousel') {
    return {
      sendMode,
      text: sanitized.text,
      footer: sanitized.footer,
      title: '',
      buttons: [],
      list: null,
      event: null,
      externalAdReply: null,
      template: null,
      product: null,
      carousel: sanitized.carousel,
    }
  }

  return {
    sendMode,
    text: sanitized.text,
    footer: '',
    title: '',
    buttons: [],
    list: null,
    event: null,
    externalAdReply: null,
    template: null,
    product: null,
    carousel: null,
  }
}
