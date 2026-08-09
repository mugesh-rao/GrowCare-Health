import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Label, Spinner } from '../atoms'
import aiService from '../../services/aiService'

const defaultRoutes = [
  { id: 'route_1', label: 'Route 1', description: '' },
  { id: 'route_2', label: 'Route 2', description: '' },
  { id: 'route_3', label: 'Route 3', description: '' },
  { id: 'route_4', label: 'Route 4', description: '' },
  { id: 'fallback', label: 'Fallback', description: 'Use this path when no route matches or confidence is low.' },
]

function normalizeRoutes(routes = []) {
  return defaultRoutes.map((route) => {
    const match = Array.isArray(routes) ? routes.find((item) => item?.id === route.id) : null
    return { ...route, ...match }
  })
}

export default function AIRouterConfig({ data, update, routeTargets }) {
  const [providers, setProviders] = useState([])
  const [fetchedModels, setFetchedModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelError, setModelError] = useState('')

  useEffect(() => {
    aiService.providers().then(setProviders).catch(() => setProviders([]))
  }, [])

  const providerId = data.provider || 'openai'
  const current = providers.find((provider) => provider.id === providerId)
  const modelOptions = Array.from(new Set([...(current?.models || []), ...fetchedModels]))
  const routes = useMemo(() => normalizeRoutes(data.routes), [data.routes])

  const onProvider = (id) => {
    const provider = providers.find((item) => item.id === id)
    setFetchedModels(provider?.models || [])
    setModelError('')
    update({ provider: id, model: provider?.models?.[0] || '' })
  }

  const fetchModels = async () => {
    setLoadingModels(true)
    setModelError('')
    try {
      const { models: nextModels, error } = await aiService.models({
        provider: providerId,
        baseURL: data.baseURL,
      })
      setFetchedModels(nextModels || [])
      if (error) setModelError(error)
    } finally {
      setLoadingModels(false)
    }
  }

  const updateRoute = (routeId, patch) => {
    update({
      routes: routes.map((route) => (route.id === routeId ? { ...route, ...patch } : route)),
    })
  }

  return (
    <>
      <div>
        <Label>Provider</Label>
        <select className="input-base" value={providerId} onChange={(e) => onProvider(e.target.value)}>
          {providers.length === 0 && <option>Loading...</option>}
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>{provider.name}</option>
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
          {modelOptions.map((model) => (
            <option key={model} value={model}>{model}</option>
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
              ? 'Enter your API key, then "Fetch models" for the live list.'
              : 'Type the model name for this provider.'}
          </p>
        )}
      </div>

      <div>
        <Label>Routing prompt</Label>
        <textarea
          className="input-base min-h-28"
          placeholder="You route inbound WhatsApp messages for a clinic. Decide whether the customer needs booking, pricing, support, or a fallback answer."
          value={data.systemPrompt || ''}
          onChange={(e) => update({ systemPrompt: e.target.value })}
        />
        <p className="mt-1.5 text-xs text-muted">
          The model sees the incoming customer message plus the route descriptions below and must pick one branch.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Confidence threshold</Label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.05"
            className="input-base"
            value={data.confidenceThreshold ?? 0.55}
            onChange={(e) => update({ confidenceThreshold: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Save decision as</Label>
          <input
            className="input-base"
            placeholder="router"
            value={data.saveAs || ''}
            onChange={(e) => update({ saveAs: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Fallback route</Label>
        <select
          className="input-base"
          value={data.fallbackRoute || 'fallback'}
          onChange={(e) => update({ fallbackRoute: e.target.value })}
        >
          {routes.map((route) => (
            <option key={route.id} value={route.id}>
              {route.label || route.id}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <Label>Connected route meanings</Label>
        {routes.map((route) => {
          const target = routeTargets[route.id]
          return (
            <div key={route.id} className="rounded-xl border border-line bg-canvas p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Handle: {route.id}
                </span>
                <span className="text-[11px] text-muted">
                  {target ? `Connected to ${target}` : 'Not connected yet'}
                </span>
              </div>
              <input
                className="input-base mb-2"
                placeholder="Short route label"
                value={route.label || ''}
                onChange={(e) => updateRoute(route.id, { label: e.target.value })}
              />
              <textarea
                className="input-base min-h-20"
                placeholder="Describe when the AI should choose this route."
                value={route.description || ''}
                onChange={(e) => updateRoute(route.id, { description: e.target.value })}
              />
            </div>
          )
        })}
        <p className="text-xs text-muted">
          Connect the bottom handles on the canvas to Send, Booking, Handoff, AI Reply, or any other node. The router only chooses among these connected handles.
        </p>
      </div>
    </>
  )
}
