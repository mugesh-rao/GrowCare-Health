/**
 * antiBan — number-safety for Baileys, powered by the `baileys-antiban` package.
 *
 * The package provides the heavy lifting (Gaussian-jitter rate limiting, 7-day
 * warm-up, identical-message detection, health monitoring, timelock handling).
 * This module:
 *   • keeps ONE `AntiBan` instance per connected number (in `instances`),
 *   • persists warm-up state to Firestore so it survives restarts,
 *   • exposes a small surface the rest of the server uses
 *     (`gate` before a send, `afterSend`/`afterFailed`, `onDisconnect`/`onReconnect`,
 *      `getHealth` for the dashboard),
 *   • stores per-user config on the user doc and caches it.
 *
 * The package is ESM, so it is loaded via dynamic import. If it ever fails to
 * load, every helper degrades to "allow" so sending is never blocked by a bug.
 */
const store = require('../core/store')

const DEFAULTS = {
  enabled: true,
  preset: 'conservative', // conservative | moderate | aggressive | high-volume
  humanTyping: true, // typing indicator during the pre-send delay
  spintax: true, // expand {a|b|c} message variations
  warmup: true, // ramp the daily cap for new numbers
  minDelayMs: 1500,
  maxDelayMs: 6000,
  maxPerDay: 800,
}

const RISK_MAP = { low: 'good', medium: 'moderate', high: 'high', critical: 'high' }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function bool(value, fallback) {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function number(value, fallback, { min, max } = {}) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min ?? -Infinity, Math.min(max ?? Infinity, parsed))
}

function normalizeConfig(raw = {}) {
  const cfg = { ...DEFAULTS, ...raw }
  const minDelayMs = Math.round(number(cfg.minDelayMs, DEFAULTS.minDelayMs, { min: 0, max: 60_000 }))
  const maxDelayMs = Math.round(number(cfg.maxDelayMs, DEFAULTS.maxDelayMs, { min: 0, max: 60_000 }))
  return {
    ...cfg,
    enabled: bool(cfg.enabled, DEFAULTS.enabled),
    humanTyping: bool(cfg.humanTyping, DEFAULTS.humanTyping),
    spintax: bool(cfg.spintax, DEFAULTS.spintax),
    warmup: bool(cfg.warmup, DEFAULTS.warmup),
    preset: ['conservative', 'moderate', 'aggressive', 'high-volume'].includes(cfg.preset)
      ? cfg.preset
      : DEFAULTS.preset,
    minDelayMs: Math.min(minDelayMs, maxDelayMs),
    maxDelayMs: Math.max(minDelayMs, maxDelayMs),
    maxPerDay: Math.round(number(cfg.maxPerDay, DEFAULTS.maxPerDay, { min: 1, max: 10_000 })),
  }
}

/* ------------------------- package loader (ESM) -------------------------- */
let pkg = null
let pkgTried = false
async function getPkg() {
  if (pkgTried) return pkg
  pkgTried = true
  try {
    pkg = await import('baileys-antiban')
  } catch (e) {
    console.error('[antiban] package failed to load — protection disabled:', e.message)
    pkg = null
  }
  return pkg
}

/* ------------------------------ user config ------------------------------ */
const cfgCache = new Map() // uid -> { cfg, exp }

async function getConfig(uid) {
  const hit = cfgCache.get(uid)
  if (hit && hit.exp > Date.now()) return hit.cfg
  let user = null
  try {
    user = await store.getDoc(`users/${uid}`)
  } catch {
    /* defaults */
  }
  const cfg = normalizeConfig(user?.antiBan || {})
  cfgCache.set(uid, { cfg, exp: Date.now() + 60_000 })
  return cfg
}

// Map our user-facing config to the package's flat config.
function toPackageConfig(cfg) {
  return {
    preset: cfg.preset || 'conservative',
    maxPerDay: cfg.maxPerDay,
    minDelayMs: cfg.minDelayMs,
    maxDelayMs: cfg.maxDelayMs,
    warmupDays: cfg.warmup ? 7 : 1,
    day1Limit: cfg.warmup ? 20 : cfg.maxPerDay,
    logging: false,
  }
}

/* -------------------------------- spintax -------------------------------- */
function applySpintax(text) {
  if (typeof text !== 'string' || text.indexOf('{') === -1) return text
  let out = text
  for (let i = 0; i < 5; i++) {
    const next = out.replace(/\{([^{}]*\|[^{}]*)\}/g, (_, g) => {
      const opts = g.split('|')
      return opts[Math.floor(Math.random() * opts.length)]
    })
    if (next === out) break
    out = next
  }
  return out
}

/* --------------------------- instance lifecycle -------------------------- */
const instances = new Map() // "uid:sid" -> { ab, uid, sessionId }
const ikey = (uid, sid) => `${uid}:${sid}`

async function ensureInstance(uid, sessionId) {
  const k = ikey(uid, sessionId)
  if (instances.has(k)) return instances.get(k).ab
  const p = await getPkg()
  if (!p) return null
  const cfg = await getConfig(uid)
  let saved = null
  try {
    const s = await store.getDoc(`users/${uid}/sessions/${sessionId}`)
    saved = s?.warmupState || null
  } catch {
    /* ignore */
  }
  let ab
  try {
    ab = new p.AntiBan(toPackageConfig(cfg), saved || undefined)
  } catch (e) {
    console.error('[antiban] init failed:', e.message)
    return null
  }
  instances.set(k, { ab, uid, sessionId })
  return ab
}

function getInstance(uid, sessionId) {
  return instances.get(ikey(uid, sessionId))?.ab || null
}

async function saveInstance(uid, sessionId) {
  const e = instances.get(ikey(uid, sessionId))
  if (!e?.ab?.exportWarmUpState) return
  try {
    await store.setDoc(`users/${uid}/sessions/${sessionId}`, {
      warmupState: e.ab.exportWarmUpState(),
    })
  } catch {
    /* best-effort */
  }
}

async function dropInstance(uid, sessionId) {
  await saveInstance(uid, sessionId)
  instances.delete(ikey(uid, sessionId))
}

async function flushAll() {
  for (const { uid, sessionId } of [...instances.values()]) {
    await saveInstance(uid, sessionId)
  }
}

let flushTimer = null
function startAutoFlush() {
  if (!flushTimer) flushTimer = setInterval(() => flushAll().catch(() => {}), 300_000)
}

function invalidate(uid) {
  cfgCache.delete(uid)
  // Drop this user's instances so the new config is picked up on next send.
  for (const k of [...instances.keys()]) {
    if (k.startsWith(`${uid}:`)) instances.delete(k)
  }
}

/* -------------------------------- gating --------------------------------- */
/**
 * Decide + pace a send. Throws (for proactive sends) when the number is over
 * its safe limit. Shows a typing indicator during the human-like delay.
 */
async function gate(uid, sessionId, sock, jid, text, { proactive, cfg }) {
  const ab = await ensureInstance(uid, sessionId)
  if (!ab) return // package unavailable → never block real sends
  let delay = 0
  try {
    const decision = await ab.beforeSend(jid, text || '')
    delay = Math.min(decision.delayMs || 0, 20_000)
    if (!decision.allowed && proactive) {
      throw new Error(
        decision.reason ||
          decision.health?.recommendation ||
          'This number has hit its safe-send limit for now — try again later or adjust Number Safety in Settings.',
      )
    }
  } catch (e) {
    if (proactive) throw e
    delay = delay || 1000 // replies are never blocked, just paced a little
  }
  try {
    if (cfg?.humanTyping && delay > 0) {
      await sock.presenceSubscribe(jid).catch(() => {})
      await sock.sendPresenceUpdate('composing', jid).catch(() => {})
    }
    if (delay) await sleep(delay)
    if (cfg?.humanTyping && delay > 0) await sock.sendPresenceUpdate('paused', jid).catch(() => {})
  } catch {
    /* presence best-effort */
  }
}

function afterSend(uid, sessionId, jid, text) {
  try {
    getInstance(uid, sessionId)?.afterSend(jid, text || '')
  } catch {
    /* ignore */
  }
}
function afterFailed(uid, sessionId, err) {
  try {
    getInstance(uid, sessionId)?.afterSendFailed(err)
  } catch {
    /* ignore */
  }
}
function onDisconnect(uid, sessionId, code) {
  try {
    getInstance(uid, sessionId)?.onDisconnect(code)
  } catch {
    /* ignore */
  }
}
function onReconnect(uid, sessionId) {
  try {
    getInstance(uid, sessionId)?.onReconnect()
  } catch {
    /* ignore */
  }
}

/* -------------------------------- health --------------------------------- */
function getHealth(uid, sessionId, cfg) {
  const merged = { ...DEFAULTS, ...(cfg || {}) }
  const ab = getInstance(uid, sessionId)
  if (!ab || !merged.enabled) {
    return {
      enabled: merged.enabled,
      warmupActive: false,
      warmupDay: null,
      dailyCap: merged.maxPerDay,
      sentToday: 0,
      remaining: merged.maxPerDay,
      risk: merged.enabled ? 0 : 15,
      level: merged.enabled ? 'good' : 'moderate',
    }
  }
  let stats = {}
  try {
    stats = ab.getStats() || {}
  } catch {
    /* ignore */
  }
  const w = stats.warmUp || {}
  const h = stats.health || {}
  const cap = w.todayLimit ?? merged.maxPerDay
  const used = w.todaySent ?? 0
  return {
    enabled: true,
    warmupActive: w.phase === 'warming',
    warmupDay: w.day ?? null,
    warmupTotalDays: w.totalDays ?? null,
    dailyCap: cap,
    sentToday: used,
    remaining: Math.max(0, cap - used),
    risk: typeof h.score === 'number' ? h.score : 0,
    level: RISK_MAP[h.risk] || 'good',
    recommendation: h.recommendation || null,
  }
}

module.exports = {
  DEFAULTS,
  normalizeConfig,
  getConfig,
  invalidate,
  applySpintax,
  ensureInstance,
  getInstance,
  dropInstance,
  flushAll,
  startAutoFlush,
  gate,
  afterSend,
  afterFailed,
  onDisconnect,
  onReconnect,
  getHealth,
}
