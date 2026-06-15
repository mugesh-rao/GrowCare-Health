const { randomUUID } = require('crypto')
const { validateButtons } = require('./buttons')
const { buildImageUpload, hasValue, validateImageSource } = require('./mediaInput')

function validateHydratedTemplate(template) {
  if (template == null) return []
  if (!template || typeof template !== 'object') {
    return ['Template configuration is invalid.']
  }
  const errors = []
  if (!hasValue(template.text)) {
    errors.push('Template body text is required.')
  }
  const buttons = Array.isArray(template.buttons) ? template.buttons : []
  if (!buttons.length) {
    errors.push('Template needs at least one button.')
  }
  buttons.forEach((button, index) => {
    if (button?.type === 'cta_copy') {
      errors.push(`Template button ${index + 1} does not support copy code.`)
    }
  })
  const buttonErrors = validateButtons(buttons)
  if (buttonErrors.length) errors.push(...buttonErrors)
  const hasImage = hasValue(template.imageUrl) || hasValue(template.imageDataUrl)
  if (hasImage) {
    errors.push(...validateImageSource({
      dataUrl: template.imageDataUrl,
      url: template.imageUrl,
      label: 'Template header',
    }))
  }
  return errors
}

function buildHydratedButtons(buttons = []) {
  return buttons.map((button, index) => {
    const label = String(button.label || button.text || '').trim()
    if (button.type === 'quick_reply') {
      return {
        index,
        quickReplyButton: {
          displayText: label,
          id: String(button.id || label).trim(),
        },
      }
    }
    if (button.type === 'cta_url') {
      return {
        index,
        urlButton: {
          displayText: label,
          url: String(button.url || '').trim(),
        },
      }
    }
    return {
      index,
      callButton: {
        displayText: label,
        phoneNumber: String(button.phoneNumber || '').trim(),
      },
    }
  })
}

function validateProduct(product) {
  if (product == null) return []
  if (!product || typeof product !== 'object') {
    return ['Product configuration is invalid.']
  }
  const errors = []
  if (!hasValue(product.businessOwnerJid)) {
    errors.push('Product business owner JID is required.')
  }
  if (!hasValue(product.title)) {
    errors.push('Product title is required.')
  }
  if (!hasValue(product.currencyCode)) {
    errors.push('Product currency code is required.')
  }
  if (!Number.isFinite(Number(product.priceAmount1000))) {
    errors.push('Product price amount is invalid.')
  }
  errors.push(...validateImageSource({
    dataUrl: product.imageDataUrl,
    url: product.imageUrl,
    label: 'Product',
  }))
  return errors
}

function buildProductPayload(product = {}) {
  return {
    businessOwnerJid: String(product.businessOwnerJid || '').trim(),
    body: String(product.body || '').trim() || undefined,
    footer: String(product.footer || '').trim() || undefined,
    product: {
      productImage: buildImageUpload({
        dataUrl: product.imageDataUrl,
        url: product.imageUrl,
      }),
      productId: String(product.productId || randomUUID()).trim(),
      title: String(product.title || '').trim(),
      description: String(product.description || '').trim() || undefined,
      currencyCode: String(product.currencyCode || '').trim(),
      priceAmount1000: Number(product.priceAmount1000),
      retailerId: String(product.retailerId || '').trim() || undefined,
      url: String(product.url || '').trim() || undefined,
      productImageCount: Number(product.productImageCount || 1),
      firstImageId: String(product.firstImageId || '').trim() || undefined,
      salePriceAmount1000: hasValue(product.salePriceAmount1000)
        ? Number(product.salePriceAmount1000)
        : undefined,
      signedUrl: String(product.signedUrl || '').trim() || undefined,
    },
  }
}

function validateCarousel(carousel) {
  if (carousel == null) return []
  if (!carousel || typeof carousel !== 'object') {
    return ['Carousel configuration is invalid.']
  }
  const cards = Array.isArray(carousel.cards) ? carousel.cards : []
  if (!cards.length) return ['Carousel needs at least one card.']
  const errors = []
  cards.forEach((card, index) => {
    const prefix = `Carousel card ${index + 1}`
    if (!card || typeof card !== 'object') {
      errors.push(`${prefix} is invalid.`)
      return
    }
    if (!hasValue(card.caption) && !hasValue(card.title)) {
      errors.push(`${prefix} needs a caption.`)
    }
    errors.push(...validateImageSource({
      dataUrl: card.imageDataUrl,
      url: card.imageUrl,
      label: prefix,
    }))
    const buttonErrors = validateButtons(card.buttons || [])
    if (buttonErrors.length) {
      errors.push(...buttonErrors.map((message) => `${prefix}: ${message}`))
    }
  })
  return errors
}

module.exports = {
  validateHydratedTemplate,
  buildHydratedButtons,
  validateProduct,
  buildProductPayload,
  validateCarousel,
}
