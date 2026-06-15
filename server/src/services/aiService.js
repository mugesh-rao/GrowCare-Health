const { PROVIDERS, resolveBaseUrl } = require('../config/ai')

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
  provider = 'openai',
  apiKey,
  baseURL,
  model,
  systemPrompt,
  userMessage,
  temperature,
}) {
  const p = PROVIDERS[provider] || PROVIDERS.openai
  const key = apiKey || process.env.OPENAI_API_KEY
  if (!key) {
    return "Thanks for your message! (AI isn't configured yet — add a provider, API key and model to the AI node.)"
  }

  try {
    const base = resolveBaseUrl(p, baseURL)
    const chosenModel = model || p.models[0]
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
  const key = apiKey || process.env.OPENAI_API_KEY
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
    const chosenModel = model || p.models[0]
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
async function fetchModels({ provider, apiKey, baseURL }) {
  const p = PROVIDERS[provider]
  if (!p) throw new Error('Unknown provider')
  if (!p.modelsEndpoint) return p.models
  const base = resolveBaseUrl(p, baseURL)
  const headers = { ...p.headers, [p.authHeader]: p.authPrefix + (apiKey || '') }
  const res = await fetch(base + p.modelsEndpoint, { headers })
  if (!res.ok) throw new Error(`Could not fetch models (${res.status})`)
  const data = await res.json()
  const list = data.data || data.models || []
  return list
    .map((m) => m.id || m.name)
    .filter(Boolean)
    .map((id) => String(id).replace(/^models\//, '')) // Gemini returns models/<id>
}

module.exports = { generateReply, fetchModels, selectRoute }
