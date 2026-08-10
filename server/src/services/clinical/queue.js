const store = require('../core/store')
const realtime = require('../core/realtime')
const wa = require('../whatsapp/whatsappService')

const bookingCollection = (uid) => `users/${uid}/bookings`
const bookingPath = (uid, id) => `${bookingCollection(uid)}/${id}`
const queueNotificationPath = (uid, id) => `users/${uid}/queueNotifications/${id}`

function localDayKey(value = Date.now()) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isSameLocalDay(value, dayKey) {
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && localDayKey(parsed) === dayKey
}

function sortQueue(list) {
  const priority = { emergency: 0, priority: 1, routine: 2 }
  return [...list].sort((a, b) => {
    const priorityDifference = (priority[a.queuePriority] ?? 2) - (priority[b.queuePriority] ?? 2)
    if (priorityDifference) return priorityDifference
    return (a.checkedInAt || new Date(a.slotIso).getTime() || 0) - (b.checkedInAt || new Date(b.slotIso).getTime() || 0)
  })
}

async function listForDay(uid, dayKey = localDayKey()) {
  const bookings = await store.listDocs(bookingCollection(uid))
  return bookings.filter((booking) => isSameLocalDay(booking.slotIso, dayKey))
}

async function nextToken(uid, dayKey) {
  const today = await listForDay(uid, dayKey)
  return Math.max(0, ...today.map((booking) => Number(booking.tokenNumber) || 0)) + 1
}

async function sendAutomaticQueueNotice(uid, booking, peopleAhead) {
  if (!booking.phone || booking.lastQueueAlertPosition === peopleAhead) return
  const notificationId = store.genId()
  const message = peopleAhead === 0
    ? `GrowCare update: Token ${booking.tokenNumber}, it is nearly your turn. Please be ready at reception.`
    : `GrowCare update: Token ${booking.tokenNumber}, ${peopleAhead} patient${peopleAhead === 1 ? '' : 's'} remain before your consultation. Please stay nearby.`
  const notification = {
    bookingId: booking.id,
    patientId: booking.patientId || '',
    phone: booking.phone,
    message,
    peopleAhead,
    createdAt: Date.now(),
    status: 'local',
  }
  try {
    const sessions = await wa.listSessions(uid)
    const connected = sessions.find((session) => session.status === 'connected')
    if (connected) {
      await wa.sendMessage(uid, connected.id, booking.phone, { text: message })
      notification.status = 'sent_whatsapp'
      notification.sessionId = connected.id
      notification.sentAt = Date.now()
    } else {
      notification.status = 'waiting_for_whatsapp'
      notification.error = 'Connect WhatsApp to deliver this automatic update.'
    }
  } catch (error) {
    notification.status = 'delivery_failed'
    notification.error = error.message
  }
  await store.setDoc(queueNotificationPath(uid, notificationId), notification, false)
  await store.setDoc(bookingPath(uid, booking.id), { lastQueueAlertPosition: peopleAhead })
}

async function refreshQueue(uid, dayKey = localDayKey()) {
  const today = await listForDay(uid, dayKey)
  const active = sortQueue(today.filter((booking) => booking.queueStatus === 'waiting'))
  let minutesAhead = 0
  const updated = []
  for (let index = 0; index < active.length; index += 1) {
    const booking = active[index]
    const patch = {
      queuePosition: index + 1,
      peopleAhead: index,
      estimatedWaitMinutes: minutesAhead,
      queueUpdatedAt: Date.now(),
    }
    await store.setDoc(bookingPath(uid, booking.id), patch)
    const next = { ...booking, ...patch }
    updated.push(next)
    if (index === 3 || index === 0) await sendAutomaticQueueNotice(uid, next, index)
    minutesAhead += Math.max(5, Number(booking.durationMinutes) || 15)
  }
  realtime.emitToUser(uid, { type: 'booking', scope: 'queue', dayKey })
  return listForDay(uid, dayKey)
}

async function checkIn(uid, id, priority = 'routine') {
  const path = bookingPath(uid, id)
  const booking = await store.getDoc(path)
  if (!booking) throw new Error('Booking not found.')
  const dayKey = localDayKey(booking.slotIso)
  const tokenNumber = booking.tokenNumber || await nextToken(uid, dayKey)
  await store.setDoc(path, {
    queueStatus: 'waiting',
    status: booking.status === 'booked' ? 'confirmed' : booking.status,
    queuePriority: ['emergency', 'priority', 'routine'].includes(priority) ? priority : 'routine',
    tokenNumber,
    checkedInAt: Date.now(),
    lastQueueAlertPosition: null,
  })
  await refreshQueue(uid, dayKey)
  return store.getDoc(path)
}

async function transition(uid, id, action) {
  const path = bookingPath(uid, id)
  const booking = await store.getDoc(path)
  if (!booking) throw new Error('Booking not found.')
  const transitions = {
    call: { queueStatus: 'in_consultation', calledAt: Date.now(), peopleAhead: 0, estimatedWaitMinutes: 0 },
    complete: { queueStatus: 'completed', status: 'completed', completedAt: Date.now() },
    no_show: { queueStatus: 'no_show', status: 'cancelled', noShowAt: Date.now() },
    return_to_queue: { queueStatus: 'waiting', status: 'confirmed', checkedInAt: booking.checkedInAt || Date.now() },
  }
  const patch = transitions[action]
  if (!patch) throw new Error('Unsupported queue action.')
  await store.setDoc(path, patch)
  await refreshQueue(uid, localDayKey(booking.slotIso))
  return store.getDoc(path)
}

async function dashboard(uid, dayKey = localDayKey()) {
  const list = await refreshQueue(uid, dayKey)
  const notifications = await store.listDocs(`users/${uid}/queueNotifications`)
  const queue = sortQueue(list.filter((booking) => ['waiting', 'in_consultation'].includes(booking.queueStatus)))
  return {
    dayKey,
    queue,
    appointments: [...list].sort((a, b) => new Date(a.slotIso) - new Date(b.slotIso)),
    notifications: notifications.filter((item) => list.some((booking) => booking.id === item.bookingId)).sort((a, b) => b.createdAt - a.createdAt),
    stats: {
      total: list.filter((item) => item.status !== 'cancelled').length,
      waiting: list.filter((item) => item.queueStatus === 'waiting').length,
      inConsultation: list.filter((item) => item.queueStatus === 'in_consultation').length,
      completed: list.filter((item) => item.queueStatus === 'completed').length,
      noShows: list.filter((item) => item.queueStatus === 'no_show').length,
      averageWaitMinutes: Math.round(list.filter((item) => item.calledAt && item.checkedInAt).reduce((total, item, _, arr) => total + ((item.calledAt - item.checkedInAt) / 60000) / arr.length, 0) || 0),
    },
  }
}

module.exports = { localDayKey, listForDay, refreshQueue, checkIn, transition, dashboard }
