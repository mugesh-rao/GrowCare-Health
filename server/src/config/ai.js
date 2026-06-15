/**
 * ai.js — provider registry for the workflow AI node (dynamic & extensible).
 *
 * Each provider defines how to build the request and parse the response, so we
 * support both OpenAI-compatible APIs and differently-shaped ones (e.g. Gemini)
 * from a single registry. `buildBody(systemPrompt, userMessage, opts)` honours
 * the user's system prompt. Providers with `modelsEndpoint` support live model
 * fetching.
 */

// Shared builder/parser for OpenAI chat-completions compatible providers.
const oai = {
  method: 'POST',
  authHeader: 'Authorization',
  authPrefix: 'Bearer ',
  headers: { 'Content-Type': 'application/json' },
  endpointPath: () => '/chat/completions',
  modelsEndpoint: '/models',
  buildBody: (systemPrompt, userMessage, opts = {}) => ({
    model: opts.model,
    temperature: opts.temperature ?? 0.7,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: userMessage },
    ],
  }),
  parseResponse: (data) => data?.choices?.[0]?.message?.content?.trim() ?? '',
  parseStreamChunk: (json) => json?.choices?.[0]?.delta?.content ?? '',
  streamSupport: true,
}

const PROVIDERS = {
  openai: {
    id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'], ...oai,
  },
  openrouter: {
    id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1',
    ...oai,
    headers: { 'Content-Type': 'application/json', 'X-Title': 'Growto' },
    models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-70b-instruct'],
  },
  nvidia: {
    id: 'nvidia', name: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1',
    ...oai,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    models: [
      'meta/llama-3.1-70b-instruct',
      'meta/llama-3.1-405b-instruct',
      'mistralai/mixtral-8x22b-instruct-v0.1',
      'minimaxai/minimax-m3',
      'google/diffusiongemma-26b-a4b-it',
      'nvidia/nemotron-3-ultra-550b-a55b',
      'nvidia/nemotron-3.5-content-safety',
      'nvidia/cosmos3-nano',
      'nvidia/cosmos3-nano-reasoner',
      'stepfun-ai/step-3.7-flash',
      'moonshotai/kimi-k2.6',
      'mistralai/mistral-medium-3.5-128b',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
      'deepseek-ai/deepseek-v4-flash',
      'deepseek-ai/deepseek-v4-pro',
      'z-ai/glm-5.1',
      'nvidia/nemotron-3-content-safety',
      'nvidia/synthetic-video-detector',
      'nvidia/Active Speaker Detection',
      'nvidia/ising-calibration-1-35b-a3b',
      'minimaxai/minimax-m2.7',
      'google/gemma-4-31b-it',
      'mistralai/mistral-small-4-119b-2603',
      'nvidia/nemotron-voicechat',
      'nvidia/nemotron-3-super-120b-a12b',
      'qwen/qwen3.5-122b-a10b',
      'nvidia/gliner-pii',
    ],
  },

  mistral: {
    id: 'mistral', name: 'Mistral', baseUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-large-latest', 'mistral-small-latest'], ...oai,
  },
  gemini: {
    id: 'gemini', name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    authHeader: 'x-goog-api-key',
    authPrefix: '',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    endpointPath: (model) => `/models/${model}:generateContent`,
    modelsEndpoint: '/models',
    buildBody: (systemPrompt, userMessage, opts = {}) => ({
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: opts.temperature ?? 1,
        maxOutputTokens: opts.maxTokens ?? 2048,
      },
    }),
    parseResponse: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '',
    streamSupport: false,
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  },

}

/** Base URL — `custom` uses the user-supplied one. */
function resolveBaseUrl(provider, baseURL) {
  if (provider.id === 'custom') return (baseURL || '').replace(/\/+$/, '')
  return provider.baseUrl
}

/** Function-free list for the frontend. */
function publicProviders() {
  return Object.values(PROVIDERS).map((p) => ({
    id: p.id,
    name: p.name,
    models: p.models,
    supportsModelFetch: Boolean(p.modelsEndpoint),
    custom: p.id === 'custom',
  }))
}

module.exports = { PROVIDERS, resolveBaseUrl, publicProviders }
