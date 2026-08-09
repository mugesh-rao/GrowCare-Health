const express = require('express')
const { publicProviders } = require('../config/ai')
const ai = require('../services/ai/service')

const router = express.Router()

// GET /api/ai/providers — dynamic provider list for the workflow AI node.
router.get('/providers', (req, res) => {
  res.json({ providers: publicProviders() })
})

// POST /api/ai/models { provider, apiKey, baseURL } — live model list (proxied
// server-side to avoid CORS / exposing keys). Falls back to defaults on error.
router.post('/models', async (req, res) => {
  const { provider, apiKey, baseURL } = req.body || {}
  try {
    const models = await ai.fetchModels({ uid: req.user.uid, provider, apiKey, baseURL })
    res.json({ models })
  } catch (e) {
    const { PROVIDERS } = require('../config/ai')
    res.json({ models: PROVIDERS[provider]?.models || [], error: e.message })
  }
})

module.exports = router
