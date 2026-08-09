const express = require('express')
const store = require('../services/store')

const router = express.Router()

// GET /api/bookings — upcoming-first list of appointments/reservations.
router.get('/', async (req, res) => {
  const list = await store.listDocs(`users/${req.user.uid}/bookings`)
  list.sort((a, b) => new Date(a.slotIso || 0) - new Date(b.slotIso || 0))
  res.json({ bookings: list })
})

// POST /api/bookings — clinician-created appointments, independent of workflows.
router.post('/', async (req, res) => {
  const body = req.body || {}
  const slotIso = String(body.slotIso || '')
  if (!slotIso || Number.isNaN(new Date(slotIso).getTime())) return res.status(400).json({ message: 'Choose a valid appointment date and time.' })
  if (!String(body.name || '').trim()) return res.status(400).json({ message: 'Patient name is required.' })
  const id = store.genId()
  const appointment = {
    name: String(body.name).trim(), phone: String(body.phone || '').trim(), service: String(body.service || 'Consultation').trim(),
    slotIso, slotLabel: new Date(slotIso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    status: 'booked', source: 'manual', createdAt: Date.now(),
  }
  await store.setDoc(`users/${req.user.uid}/bookings/${id}`, appointment, false)
  res.status(201).json({ booking: { id, ...appointment } })
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
