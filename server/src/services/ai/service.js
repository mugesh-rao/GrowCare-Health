const { PROVIDERS, resolveBaseUrl } = require('../../config/ai')
const store = require('../core/store')
const secureSettings = require('../core/secureSettings')

async function localAiSettings(uid) {
  return secureSettings.readAISettings(uid || 'local-owner')
}

async function resolveCredentials({ uid, provider = 'openai', apiKey, model, preferProvidedKey = false }) {
  const settings = provider === 'openai' ? await localAiSettings(uid) : {}
  return {
    // A temporary key supplied by the settings "Test" action must take precedence
    // without changing the key the rest of the application uses.
    apiKey: (preferProvidedKey && apiKey) || settings.apiKey || apiKey || process.env.OPENAI_API_KEY || '',
    model: settings.model || model || (provider === 'openai' ? 'gpt-5.6-luna' : ''),
  }
}

function extractJsonObject(text = '') {
  const raw = String(text || '').trim()
  if (!raw) return null
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {}
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1))
    } catch {}
  }
  return null
}

function clampConfidence(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

/**
 * aiService — dynamically calls any configured provider (config/ai.js).
 * The AI node supplies: provider, apiKey, model, systemPrompt (+ baseURL for custom).
 */
async function generateReply({
  uid,
  provider = 'openai',
  apiKey,
  baseURL,
  model,
  systemPrompt,
  userMessage,
  temperature,
}) {
  const p = PROVIDERS[provider] || PROVIDERS.openai
  const credentials = await resolveCredentials({ uid, provider, apiKey, model })
  const key = credentials.apiKey
  if (!key) {
    return "Thanks for your message! (AI isn't configured yet — add a provider, API key and model to the AI node.)"
  }

  try {
    const base = resolveBaseUrl(p, baseURL)
    const chosenModel = credentials.model || p.models[0]
    const url = base + p.endpointPath(chosenModel)
    const headers = { ...p.headers, [p.authHeader]: p.authPrefix + key }
    const body = p.buildBody(systemPrompt, userMessage, { model: chosenModel, temperature })

    const res = await fetch(url, { method: p.method, headers, body: JSON.stringify(body) })
    if (!res.ok) {
      const errText = await res.text()
      console.error(`[ai] ${p.name} ${res.status}: ${errText.slice(0, 300)}`)
      return "Sorry, I couldn't generate a reply right now."
    }
    const data = await res.json()
    return p.parseResponse(data) || "Sorry, I couldn't generate a reply right now."
  } catch (e) {
    console.error('[ai] request failed:', e.message)
    return "Sorry, I couldn't generate a reply right now."
  }
}

async function selectRoute({
  uid,
  provider = 'openai',
  apiKey,
  baseURL,
  model,
  systemPrompt,
  userMessage,
  routes = [],
  contextVars = {},
}) {
  const p = PROVIDERS[provider] || PROVIDERS.openai
  const credentials = await resolveCredentials({ uid, provider, apiKey, model })
  const key = credentials.apiKey
  if (!key) {
    return {
      route: null,
      confidence: 0,
      reason: "AI isn't configured yet.",
      raw: '',
    }
  }

  const candidates = (Array.isArray(routes) ? routes : [])
    .map((route) => ({
      id: String(route?.id || '').trim(),
      label: String(route?.label || '').trim(),
      description: String(route?.description || '').trim(),
      target: String(route?.target || '').trim(),
    }))
    .filter((route) => route.id)

  if (!candidates.length) {
    return {
      route: null,
      confidence: 0,
      reason: 'No connected routes were available.',
      raw: '',
    }
  }

  const fixedSystemPrompt =
    'You are an intent router for a WhatsApp automation workflow. Choose exactly one route from the provided ids. Return raw JSON only with keys route, confidence, and reason.'
  const routePrompt = [
    systemPrompt ? `Business instructions:\n${systemPrompt}` : '',
    Object.keys(contextVars || {}).length
      ? `Known workflow data:\n${JSON.stringify(contextVars, null, 2)}`
      : '',
    'Available routes:',
    ...candidates.map((route) =>
      `- ${route.id}: ${route.label || route.id}${route.description ? ` — ${route.description}` : ''}${route.target ? ` (connected to ${route.target})` : ''}`,
    ),
    `Customer message:\n${String(userMessage || '').trim() || '(empty message)'}`,
    'Return JSON only. Example:',
    `{"route":"${candidates[0].id}","confidence":0.82,"reason":"short reason"}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const base = resolveBaseUrl(p, baseURL)
    const chosenModel = credentials.model || p.models[0]
    const url = base + p.endpointPath(chosenModel)
    const headers = { ...p.headers, [p.authHeader]: p.authPrefix + key }
    const body = p.buildBody(fixedSystemPrompt, routePrompt, {
      model: chosenModel,
      temperature: 0,
      maxTokens: 300,
    })

    const res = await fetch(url, { method: p.method, headers, body: JSON.stringify(body) })
    if (!res.ok) {
      const errText = await res.text()
      console.error(`[ai route] ${p.name} ${res.status}: ${errText.slice(0, 300)}`)
      return { route: null, confidence: 0, reason: 'Route selection failed.', raw: '' }
    }

    const data = await res.json()
    const raw = p.parseResponse(data) || ''
    const parsed = extractJsonObject(raw) || {}
    const chosenRoute = String(parsed.route || '').trim()

    return {
      route: chosenRoute || null,
      confidence: clampConfidence(parsed.confidence),
      reason: String(parsed.reason || '').trim(),
      raw,
    }
  } catch (e) {
    console.error('[ai route] request failed:', e.message)
    return { route: null, confidence: 0, reason: 'Route selection failed.', raw: '' }
  }
}

/** Fetch the live model list for a provider (throws on auth/network error). */
async function fetchModels({ uid, provider, apiKey, baseURL }) {
  const p = PROVIDERS[provider]
  if (!p) throw new Error('Unknown provider')
  if (!p.modelsEndpoint) return p.models
  const base = resolveBaseUrl(p, baseURL)
  const credentials = await resolveCredentials({
    uid,
    provider,
    apiKey,
    preferProvidedKey: Boolean(apiKey),
  })
  const headers = { ...p.headers, [p.authHeader]: p.authPrefix + credentials.apiKey }
  const res = await fetch(base + p.modelsEndpoint, { headers })
  if (!res.ok) throw new Error(`Could not fetch models (${res.status})`)
  const data = await res.json()
  const list = data.data || data.models || []
  return list
    .map((m) => m.id || m.name)
    .filter(Boolean)
    .map((id) => String(id).replace(/^models\//, '')) // Gemini returns models/<id>
}

async function generateScribeDraft({ uid, transcript, patient }) {
  const settings = await localAiSettings(uid)
  if (!settings.apiKey || !settings.useForScribing || !String(transcript || '').trim()) return null

  const prompt = [
    'Create a concise clinical visit draft from the supplied transcript.',
    'Return JSON only with chiefComplaint, examination, diagnosis, followUp, and prescriptions.',
    'prescriptions must be an array of { drug, dose, frequency, route, duration }. Do not invent facts. Use empty strings or an empty array where the transcript is unclear.',
    `Patient context: ${JSON.stringify({ name: patient?.name, specialty: patient?.specialty, condition: patient?.condition })}`,
    `Transcript:\n${String(transcript).slice(0, 180000)}`,
  ].join('\n\n')

  try {
    const p = PROVIDERS.openai
    const response = await fetch(resolveBaseUrl(p), {
      method: p.method,
      headers: { ...p.headers, [p.authHeader]: p.authPrefix + settings.apiKey },
      body: JSON.stringify(p.buildBody('You are a clinical documentation assistant. Draft only; clinician review is required.', prompt, { model: settings.model || p.models[0], temperature: 0.1, maxTokens: 1600 })),
    })
    if (!response.ok) return null
    const parsed = extractJsonObject(p.parseResponse(await response.json()))
    if (!parsed || typeof parsed !== 'object') return null
    return {
      chiefComplaint: String(parsed.chiefComplaint || '').slice(0, 5000),
      examination: String(parsed.examination || '').slice(0, 8000),
      diagnosis: String(parsed.diagnosis || '').slice(0, 5000),
      followUp: String(parsed.followUp || '').slice(0, 5000),
      prescriptions: Array.isArray(parsed.prescriptions) ? parsed.prescriptions.slice(0, 20) : [],
    }
  } catch {
    return null
  }
}

module.exports = { generateReply, fetchModels, selectRoute, generateScribeDraft }
