const fs = require('fs')
const path = require('path')
const { initializeApp, getApps, cert, applicationDefault } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')

/**
 * Initializes Firebase Admin (modular SDK). Credentials are resolved from, in order:
 *   1. FIREBASE_SERVICE_ACCOUNT  — the service-account JSON as a single-line string
 *   2. GOOGLE_APPLICATION_CREDENTIALS — path to a service-account .json
 *   3. ./service.json or ./serviceAccount.json next to the server
 *
 * If none resolve, the app runs in LOCAL DEV mode (file store + dev auth).
 */
let firebaseEnabled = false
let db = null
let auth = null

function resolveCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw && raw.trim()) return cert(JSON.parse(raw))

  const explicit = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (explicit && fs.existsSync(explicit)) return cert(require(path.resolve(explicit)))

  for (const f of ['service.json', 'serviceAccount.json']) {
    const p = path.resolve(process.cwd(), f)
    if (fs.existsSync(p)) return cert(require(p))
  }

  // Last resort: ADC from environment (may not be configured).
  if (explicit) return applicationDefault()
  return null
}

function init() {
  if (getApps().length) {
    firebaseEnabled = true
  } else {
    try {
      const credential = resolveCredential()
      if (!credential) {
        console.warn(
          '[firebase] No credentials found — running in LOCAL DEV mode (file store + dev auth).',
        )
        return
      }
      initializeApp({
        credential,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined,
      })
      firebaseEnabled = true
    } catch (err) {
      console.error('[firebase] init failed:', err.message)
      console.warn('[firebase] Falling back to LOCAL DEV mode.')
      return
    }
  }

  db = getFirestore()
  auth = getAuth()
  console.log('[firebase] Admin initialized — Firestore + Auth active.')
}

init()

module.exports = {
  get db() {
    return db
  },
  get auth() {
    return auth
  },
  get firebaseEnabled() {
    return firebaseEnabled
  },
}
