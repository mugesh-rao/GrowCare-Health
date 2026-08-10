const express = require('express')
const store = require('../services/core/store')
const realtime = require('../services/core/realtime')
const queueService = require('../services/clinical/queue')

const router = express.Router()

// GET /api/bookings — upcoming-first list of appointments/reservations.
router.get('/', async (req, res) => {
  const list = await store.listDocs(`users/${req.user.uid}/bookings`)
  list.sort((a, b) => new Date(a.slotIso || 0) - new Date(b.slotIso || 0))
  res.json({ bookings: list })
})

// GET /api/bookings/queue/today?date=YYYY-MM-DD — reception's live queue.
router.get('/queue/today', async (req, res) => {
  try {
    res.json(await queueService.dashboard(req.user.uid, req.query.date || queueService.localDayKey()))
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not load the live clinic queue.' })
  }
})

// GET /api/bookings/public/check-in/:code — QR check-in landing page.
router.get('/public/check-in/:code', async (req, res) => {
  const bookings = await store.listDocs(`users/${req.user.uid}/bookings`)
  const booking = bookings.find((item) => item.checkInCode === req.params.code)
  if (!booking) return res.status(404).send('<h1>Check-in code not found</h1>')
  try {
    const checkedIn = await queueService.checkIn(req.user.uid, booking.id, 'routine')
    res.type('html').send(`<!doctype html><html><meta name="viewport" content="width=device-width"><title>GrowCare check-in</title><body style="font-family:system-ui;background:#f7f6f2;color:#1c1a1e;display:grid;place-items:center;min-height:100vh;margin:0"><main style="max-width:420px;background:#fffefb;border:1px solid #e6e1d9;border-radius:24px;padding:32px;text-align:center"><h1 style="color:#176c68">You are checked in</h1><p>Welcome, ${String(checkedIn.name).replace(/[<>&]/g, '')}.</p><p style="font-size:32px;font-weight:700">Token ${checkedIn.tokenNumber}</p><p>${checkedIn.peopleAhead || 0} patient(s) ahead · approximately ${checkedIn.estimatedWaitMinutes || 0} minutes.</p><p style="color:#79746e">You may wait nearby. GrowCare will notify you as your turn approaches.</p></main></body></html>`)
  } catch (error) {
    res.status(400).send(`<h1>Could not check in</h1><p>${String(error.message).replace(/[<>&]/g, '')}</p>`)
  }
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
    durationMinutes: Math.max(5, Number(body.durationMinutes) || 30), notes: String(body.notes || '').trim(),
    slotIso, slotLabel: new Date(slotIso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    patientId: String(body.patientId || '').trim(), doctor: String(body.doctor || '').trim(),
    status: 'booked', queueStatus: 'scheduled', queuePriority: 'routine', checkInCode: store.genId(), source: 'manual', createdAt: Date.now(),
  }
  await store.setDoc(`users/${req.user.uid}/bookings/${id}`, appointment, false)
  realtime.emitToUser(req.user.uid, { type: 'booking', bookingId: id })
  res.status(201).json({ booking: { id, ...appointment } })
})

// POST /api/bookings/:id/check-in — assign today's token and join the live queue.
router.post('/:id/check-in', async (req, res) => {
  try {
    const booking = await queueService.checkIn(req.user.uid, req.params.id, req.body?.priority)
    res.json({ booking })
  } catch (error) {
    res.status(error.message === 'Booking not found.' ? 404 : 400).json({ message: error.message })
  }
})

// POST /api/bookings/:id/queue-action — call, complete, no-show, or return.
router.post('/:id/queue-action', async (req, res) => {
  try {
    const booking = await queueService.transition(req.user.uid, req.params.id, req.body?.action)
    res.json({ booking })
  } catch (error) {
    res.status(error.message === 'Booking not found.' ? 404 : 400).json({ message: error.message })
  }
})

// POST /api/bookings/:id/reschedule
router.post('/:id/reschedule', async (req, res) => {
  const path = `users/${req.user.uid}/bookings/${req.params.id}`
  const booking = await store.getDoc(path)
  const slotIso = String(req.body?.slotIso || '')
  if (!booking) return res.status(404).json({ message: 'Booking not found.' })
  if (!slotIso || Number.isNaN(new Date(slotIso).getTime())) return res.status(400).json({ message: 'Choose a valid appointment date and time.' })
  await store.setDoc(path, {
    slotIso,
    slotLabel: new Date(slotIso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    queueStatus: 'scheduled', tokenNumber: null, checkedInAt: null, queuePosition: null,
    status: 'booked', rescheduledAt: Date.now(),
  })
  realtime.emitToUser(req.user.uid, { type: 'booking', bookingId: req.params.id })
  res.json({ booking: await store.getDoc(path) })
})

// PATCH /api/bookings/:id  { status }
router.patch('/:id', async (req, res) => {
  const path = `users/${req.user.uid}/bookings/${req.params.id}`
  if (!(await store.getDoc(path))) return res.status(404).json({ message: 'Booking not found.' })
  const allowed = ['status', 'name', 'phone', 'service', 'notes', 'doctor', 'patientId', 'durationMinutes']
  const patch = Object.fromEntries(allowed.filter((field) => req.body?.[field] !== undefined).map((field) => [field, req.body[field]]))
  if (Object.keys(patch).length) await store.setDoc(path, patch)
  realtime.emitToUser(req.user.uid, { type: 'booking', bookingId: req.params.id })
  res.json({ booking: await store.getDoc(path) })
})

// DELETE /api/bookings/:id
router.delete('/:id', async (req, res) => {
  await store.deleteDoc(`users/${req.user.uid}/bookings/${req.params.id}`)
  res.json({ ok: true })
})

module.exports = router
