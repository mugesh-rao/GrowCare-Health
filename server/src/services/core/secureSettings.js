/**
 * Local secret vault for the single-machine GrowCare installation.
 *
 * Secrets are encrypted before they are placed in SQLite.  The random vault
 * key lives in a separate, user-only application-data file, which also keeps
 * encrypted database backups from containing usable API keys.  The vault is
 * intentionally server-only: routes expose a boolean status, never a secret.
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const store = require('./store')

const DATA_DIR = process.env.APP_DATA_DIR || path.join(process.cwd(), '.data')
const VAULT_FILE = path.join(DATA_DIR, '.growcare-vault-key')

function vaultKey() {
  try {
    const key = fs.readFileSync(VAULT_FILE)
    if (key.length === 32) return key
  } catch {}
  const key = crypto.randomBytes(32)
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(VAULT_FILE, key, { mode: 0o600 })
  return key
}

function encrypt(value) {
  const text = String(value || '')
  if (!text) return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', vaultKey(), iv)
  const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.')
}

function decrypt(ciphertext) {
  if (!ciphertext || !String(ciphertext).startsWith('v1.')) return ''
  const [, iv, tag, data] = String(ciphertext).split('.')
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', vaultKey(), Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    return ''
  }
}

function publicAISettings(settings = {}) {
  return {
    hasApiKey: Boolean(settings.apiKeyCipher || settings.apiKey),
    model: settings.model || 'gpt-5.6-luna',
    embeddingModel: settings.embeddingModel || 'text-embedding-3-small',
    useForScribing: Boolean(settings.useForScribing),
    useForClinicalAI: Boolean(settings.useForClinicalAI),
    updatedAt: settings.updatedAt || null,
  }
}

async function readAISettings(uid) {
  const user = await store.getDoc(`users/${uid}`)
  const settings = user?.aiSettings || {}
  // One-time migration from the legacy plaintext field.  The plaintext is
  // removed from the JSON document immediately after a server reads it.
  if (settings.apiKey && !settings.apiKeyCipher) {
    const migrated = { ...settings, apiKeyCipher: encrypt(settings.apiKey) }
    delete migrated.apiKey
    await store.setDoc(`users/${uid}`, { aiSettings: migrated })
    return { ...migrated, apiKey: settings.apiKey }
  }
  return { ...settings, apiKey: decrypt(settings.apiKeyCipher) }
}

async function saveAISettings(uid, body = {}) {
  const user = await store.getDoc(`users/${uid}`)
  const previous = user?.aiSettings || {}
  const next = {
    ...previous,
    model: String(body.model ?? previous.model ?? 'gpt-5.6-luna').trim() || 'gpt-5.6-luna',
    embeddingModel: String(body.embeddingModel ?? previous.embeddingModel ?? 'text-embedding-3-small').trim() || 'text-embedding-3-small',
    useForScribing: body.useForScribing === undefined ? Boolean(previous.useForScribing) : Boolean(body.useForScribing),
    useForClinicalAI: body.useForClinicalAI === undefined ? Boolean(previous.useForClinicalAI) : Boolean(body.useForClinicalAI),
    updatedAt: Date.now(),
  }
  if (body.clearApiKey) next.apiKeyCipher = ''
  else if (body.apiKey !== undefined && String(body.apiKey).trim()) next.apiKeyCipher = encrypt(String(body.apiKey).trim())
  delete next.apiKey
  await store.setDoc(`users/${uid}`, { aiSettings: next })
  return publicAISettings(next)
}

function sanitizeUser(user = {}) {
  const safe = { ...user }
  if (safe.aiSettings) safe.aiSettings = publicAISettings(safe.aiSettings)
  return safe
}

module.exports = { readAISettings, saveAISettings, publicAISettings, sanitizeUser }
