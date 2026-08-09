/**
 * Converts Growto's button config into the native-flow
 * `interactiveButtons` shape used by Baileys relay sends.
 *
 * Growto button: { type, label, id?, url?, copyCode?, phoneNumber? }
 *   type ∈ quick_reply | cta_url | cta_copy | cta_call
 */
function validateButtons(buttons = []) {
  const errors = []

  if (!Array.isArray(buttons)) {
    return ['Buttons must be an array.']
  }

  buttons.forEach((button, index) => {
    const prefix = `Button ${index + 1}`
    if (!button || typeof button !== 'object') {
      errors.push(`${prefix} is invalid.`)
      return
    }

    const label = String(button.label || button.text || '').trim()
    if (!label) errors.push(`${prefix} is missing a label.`)

    switch (button.type) {
      case 'quick_reply':
        break
      case 'cta_url':
        if (!String(button.url || '').trim()) errors.push(`${prefix} is missing a URL.`)
        break
      case 'cta_copy':
        if (!String(button.copyCode || '').trim()) errors.push(`${prefix} is missing a copy code.`)
        break
      case 'cta_call':
        if (!String(button.phoneNumber || '').trim()) errors.push(`${prefix} is missing a phone number.`)
        break
      default:
        errors.push(`${prefix} has an unsupported type.`)
    }
  })

  return errors
}

function buildInteractiveButtons(buttons = []) {
  return (buttons || [])
    .map((b) => {
      const label = String(b.label || b.text || 'Button').trim()
      switch (b.type) {
        case 'quick_reply':
          return {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: label, id: b.id || label }),
          }
        case 'cta_url':
          return {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({ display_text: label, url: b.url || '' }),
          }
        case 'cta_copy':
          return {
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({ display_text: label, copy_code: b.copyCode || '' }),
          }
        case 'cta_call':
          return {
            name: 'cta_call',
            buttonParamsJson: JSON.stringify({ display_text: label, phone_number: b.phoneNumber || '' }),
          }
        default:
          return null
      }
    })
    .filter(Boolean)
}

module.exports = { buildInteractiveButtons, validateButtons }
