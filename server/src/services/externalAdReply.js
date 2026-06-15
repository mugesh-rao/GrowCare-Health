const { dataUrlToBuffer, hasValue, isDataUrl } = require('./mediaInput')

function validateExternalAdReply(adReply) {
  if (adReply == null) return []
  if (!adReply || typeof adReply !== 'object') {
    return ['External ad reply configuration is invalid.']
  }

  const errors = []
  if (!hasValue(adReply.title)) {
    errors.push('External ad reply title is required.')
  }
  if (!hasValue(adReply.thumbnailUrl) && !hasValue(adReply.thumbnailDataUrl)) {
    errors.push('External ad reply needs a thumbnail image URL or uploaded image.')
  }
  if (hasValue(adReply.thumbnailDataUrl) && !isDataUrl(adReply.thumbnailDataUrl)) {
    errors.push('External ad reply uploaded thumbnail is invalid.')
  }
  if (hasValue(adReply.url)) {
    try {
      new URL(String(adReply.url).trim())
    } catch {
      errors.push('External ad reply URL is invalid.')
    }
  }
  if (hasValue(adReply.thumbnailUrl)) {
    try {
      new URL(String(adReply.thumbnailUrl).trim())
    } catch {
      errors.push('External ad reply thumbnail URL is invalid.')
    }
  }

  return errors
}

async function resolveThumbnailBuffer(adReply = {}) {
  if (hasValue(adReply.thumbnailDataUrl)) {
    const decoded = dataUrlToBuffer(adReply.thumbnailDataUrl)
    if (!decoded) throw new Error('External ad reply uploaded thumbnail is invalid.')
    return decoded.buffer
  }

  if (hasValue(adReply.thumbnailUrl)) {
    const response = await fetch(String(adReply.thumbnailUrl).trim())
    if (!response.ok) {
      throw new Error(`External ad reply thumbnail fetch failed (${response.status}).`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  return undefined
}

async function buildExternalAdReply(adReply = {}) {
  const thumbnail = await resolveThumbnailBuffer(adReply)
  const url = String(adReply.url || '').trim()
  const thumbnailUrl = String(adReply.thumbnailUrl || '').trim()

  return {
    title: String(adReply.title || '').trim(),
    body: String(adReply.body || '').trim() || undefined,
    mediaType: 1,
    renderLargerThumbnail: Boolean(adReply.largeThumbnail),
    showAdAttribution: Boolean(adReply.showAdAttribution),
    sourceUrl: url || undefined,
    mediaUrl: url || undefined,
    wtwaWebsiteUrl: url || undefined,
    thumbnailUrl: thumbnailUrl || url || undefined,
    originalImageUrl: thumbnailUrl || undefined,
    thumbnail,
  }
}

module.exports = { validateExternalAdReply, buildExternalAdReply }
