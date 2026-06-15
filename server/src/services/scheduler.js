/**
 * scheduler — fires messages at a future time (reminders, drip follow-ups).
 *
 * A scheduled message lives at `users/{uid}/scheduled/{id}`:
 *   { sessionId, to, payload, runAt, status: 'pending'|'sent'|'failed', createdAt }
 *
 * A single interval worker polls for due messages across all users and sends
 * them through whatsappService (which applies anti-ban pacing + caps).
 */
const store = require('./store')

async function schedule(uid, { sessionId, to, payload, runAt }) {
  const id = store.genId()
  await store.setDoc(`users/${uid}/scheduled/${id}`, {
    sessionId,
    to,
    payload,
    runAt,
    status: 'pending',
    createdAt: Date.now(),
  })
  return id
}

async function tick() {
  let due = []
  try {
    const all = await store.listAllScheduled()
    const now = Date.now()
    due = all.filter((s) => (s.runAt || 0) <= now)
  } catch (e) {
    console.error('[scheduler] poll error:', e.message)
    return
  }
  if (!due.length) return
  const wa = require('./whatsappService') // lazy to avoid a require cycle
  for (const item of due) {
    const path = `users/${item.uid}/scheduled/${item.id}`
    try {
      await wa.sendMessage(item.uid, item.sessionId, item.to, item.payload)
      await store.setDoc(path, { status: 'sent', sentAt: Date.now() })
    } catch (e) {
      await store.setDoc(path, { status: 'failed', error: e.message, failedAt: Date.now() })
      console.error(`[scheduler] send failed (${item.id}):`, e.message)
    }
  }
}

let timer = null
function start(intervalMs = 30_000) {
  if (timer) return
  timer = setInterval(() => tick().catch(() => {}), intervalMs)
  console.log('[scheduler] started')
}

module.exports = { schedule, start, tick }
