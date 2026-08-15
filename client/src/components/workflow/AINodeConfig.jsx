import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Label, Spinner } from '../atoms'
import aiService from '../../services/aiService'

/**
 * AINodeConfig — dynamic AI provider configuration for the workflow AI node.
 * Provider list comes from the server (config/ai.js). The shared local key is
 * configured once in Settings > AI; this node only selects behavior and model.
 */
export default function AINodeConfig({ data, update }) {
  const [providers, setProviders] = useState([])
  const [models, setModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelError, setModelError] = useState('')

  useEffect(() => {
    aiService.providers().then(setProviders).catch(() => setProviders([]))
  }, [])

  const providerId = data.provider || 'openai'
  const current = providers.find((p) => p.id === providerId)
  const modelOptions = Array.from(new Set([...(current?.models || []), ...models]))

  const onProvider = (id) => {
    const p = providers.find((x) => x.id === id)
    setModels(p?.models || [])
    setModelError('')
    update({ provider: id, model: p?.models?.[0] || '' })
  }

  const fetchModels = async () => {
    setLoadingModels(true)
    setModelError('')
    try {
      const { models, error } = await aiService.models({
        provider: providerId,
        baseURL: data.baseURL,
      })
      setModels(models || [])
      if (error) setModelError(error)
    } finally {
      setLoadingModels(false)
    }
  }

  return (
    <>
      <div>
        <Label>Provider</Label>
        <select className="input-base" value={providerId} onChange={(e) => onProvider(e.target.value)}>
          {providers.length === 0 && <option>Loading…</option>}
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {providerId === 'openai' && <p className="rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-900">Uses the shared local OpenAI key from Settings → AI.</p>}

      {current?.custom && (
        <div>
          <Label>Base URL</Label>
          <input
            className="input-base"
            placeholder="https://your-endpoint/v1"
            value={data.baseURL || ''}
            onChange={(e) => update({ baseURL: e.target.value })}
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <Label>Model</Label>
          {current?.supportsModelFetch && (
            <button
              type="button"
              onClick={fetchModels}
              disabled={loadingModels}
              className="mb-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
            >
              {loadingModels ? <Spinner className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
              Fetch models
            </button>
          )}
        </div>
        <select
          className="input-base"
          value={modelOptions.includes(data.model) ? data.model : ''}
          onChange={(e) => update({ model: e.target.value })}
        >
          <option value="">Select a model</option>
          {modelOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          className="input-base mt-2"
          placeholder="Or type a custom model name"
          value={data.model || ''}
          onChange={(e) => update({ model: e.target.value })}
        />
        {modelError ? (
          <p className="mt-1.5 text-xs text-red-600">{modelError}</p>
        ) : (
          <p className="mt-1.5 text-xs text-muted">
            {current?.supportsModelFetch
              ? 'Enter your API key, then “Fetch models” for the live list.'
              : 'Type the model name for this provider.'}
          </p>
        )}
      </div>

      <div>
        <Label>System prompt</Label>
        <textarea
          className="input-base min-h-28"
          placeholder="You are a friendly sales assistant for Acme. Answer pricing questions and offer a demo."
          value={data.systemPrompt || ''}
          onChange={(e) => update({ systemPrompt: e.target.value })}
        />
        <p className="mt-1.5 text-xs text-muted">
          The incoming WhatsApp message is sent as context; the reply is generated from this prompt.
        </p>
      </div>
    </>
  )
}
