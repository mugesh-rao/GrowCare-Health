const express = require('express')
const { auth } = require('../middleware/auth')
const store = require('../services/store')

const router = express.Router()
router.use(auth)

// GET /api/bookings — upcoming-first list of appointments/reservations.
router.get('/', async (req, res) => {
  const list = await store.listDocs(`users/${req.user.uid}/bookings`)
  list.sort((a, b) => new Date(a.slotIso || 0) - new Date(b.slotIso || 0))
  res.json({ bookings: list })
})

// PATCH /api/bookings/:id  { status }
router.patch('/:id', async (req, res) => {
  const path = `users/${req.user.uid}/bookings/${req.params.id}`
  if (!(await store.getDoc(path))) return res.status(404).json({ message: 'Booking not found.' })
  if (req.body?.status) await store.setDoc(path, { status: req.body.status })
  res.json({ booking: await store.getDoc(path) })
})

// DELETE /api/bookings/:id
router.delete('/:id', async (req, res) => {
  await store.deleteDoc(`users/${req.user.uid}/bookings/${req.params.id}`)
  res.json({ ok: true })
})

module.exports = router
