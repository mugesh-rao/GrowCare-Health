const { auth: firebaseAuth, firebaseEnabled } = require('../config/firebase')

/**
 * Verifies the Firebase ID token sent as `Authorization: Bearer <token>`
 * and attaches req.user = { uid, email, name, picture }.
 *
 * In LOCAL DEV mode (no Firebase credentials), it accepts a development
 * identity so the API is usable without a Firebase project. The client may
 * send `Authorization: Bearer dev` and optional `x-dev-uid` / `x-dev-email`.
 */
async function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!firebaseEnabled) {
    req.user = {
      uid: req.headers['x-dev-uid'] || 'dev-user',
      email: req.headers['x-dev-email'] || 'dev@example.com',
      name: 'Dev User',
      picture: null,
    }
    return next()
  }

  if (!token) return res.status(401).json({ message: 'Authentication required.' })

  try {
    const decoded = await firebaseAuth.verifyIdToken(token)
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    }
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired session. Please sign in again.' })
  }
}

module.exports = { auth }
