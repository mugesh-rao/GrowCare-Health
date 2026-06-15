function hasValue(value) {
  return String(value ?? '').trim() !== ''
}

function isDataUrl(value = '') {
  return /^data:[^;]+;base64,/i.test(String(value))
}

function dataUrlToBuffer(value) {
  const match = String(value).match(/^data:([^;]+);base64,(.+)$/i)
  if (!match) return null
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  }
}

function validateImageSource({ dataUrl, url, label }) {
  const errors = []
  if (!hasValue(dataUrl) && !hasValue(url)) {
    errors.push(`${label} image is required.`)
  }
  if (hasValue(dataUrl) && !isDataUrl(dataUrl)) {
    errors.push(`${label} uploaded image is invalid.`)
  }
  if (hasValue(url)) {
    try {
      new URL(String(url).trim())
    } catch {
      errors.push(`${label} image URL is invalid.`)
    }
  }
  return errors
}

function buildImageUpload({ dataUrl, url }) {
  if (hasValue(dataUrl)) {
    const decoded = dataUrlToBuffer(dataUrl)
    if (!decoded) throw new Error('Uploaded image is invalid.')
    return decoded.buffer
  }
  if (hasValue(url)) {
    return { url: String(url).trim() }
  }
  return null
}

module.exports = {
  hasValue,
  isDataUrl,
  dataUrlToBuffer,
  validateImageSource,
  buildImageUpload,
}
