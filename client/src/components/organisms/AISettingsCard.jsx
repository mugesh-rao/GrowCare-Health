import { useEffect, useState } from 'react'
import { Check, Eye, EyeOff, KeyRound, Sparkles, Trash2 } from 'lucide-react'
import { Alert, Button, Card, Label, Spinner } from '../atoms'
import userService from '../../services/userService'
import aiService from '../../services/aiService'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-slate-300'}`}
      aria-pressed={checked}
      aria-label="Use OpenAI for scribe drafting"
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

/** Shared, local-only OpenAI configuration. The saved secret is write-only. */
export default function AISettingsCard() {
  const [settings, setSettings] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gpt-5.6-luna')
  const [useForScribing, setUseForScribing] = useState(false)
  const [useForClinicalAI, setUseForClinicalAI] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    userService.getAiSettings()
      .then((next) => {
        setSettings(next)
        setModel(next.model || 'gpt-5.6-luna')
        setUseForScribing(Boolean(next.useForScribing))
        setUseForClinicalAI(Boolean(next.useForClinicalAI))
      })
      .catch((requestError) => setError(requestError.message || 'Could not load local AI settings.'))
  }, [])

  const save = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const next = await userService.updateAiSettings({
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        model,
        useForScribing,
        useForClinicalAI,
      })
      setSettings(next)
      setApiKey('')
      setMessage('Saved locally. Your API key is never shown again.')
    } catch (requestError) {
      setError(requestError.message || 'Could not save the local AI settings.')
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setError('')
    setMessage('')
    try {
      const result = await aiService.models({ provider: 'openai', apiKey: apiKey.trim() || undefined })
      if (result.error) throw new Error(result.error)
      setMessage(`OpenAI connection is ready. ${result.models?.length || 0} model(s) are available.`)
    } catch (requestError) {
      setError(requestError.message || 'OpenAI could not be reached with this key.')
    } finally {
      setTesting(false)
    }
  }

  const clearKey = async () => {
    setSaving(true)
    setError('')
    try {
      const next = await userService.updateAiSettings({ clearApiKey: true, model, useForScribing: false, useForClinicalAI: false })
      setSettings(next)
      setApiKey('')
      setUseForScribing(false)
      setUseForClinicalAI(false)
      setMessage('The local OpenAI key was removed.')
    } catch (requestError) {
      setError(requestError.message || 'Could not remove the local OpenAI key.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <Card.Header className="flex items-center gap-2">
        <Sparkles className="h-4.5 w-4.5 text-brand-600" />
        <span className="font-semibold text-ink">OpenAI</span>
      </Card.Header>
      <Card.Body className="space-y-5">
        {!settings ? <div className="grid place-items-center py-7"><Spinner className="h-6 w-6 text-brand-600" /></div> : <>
          <Alert tone="info">The key is stored only in this GrowCare workspace. It is write-only in the interface and is used by the local server for configured AI actions.</Alert>
          <div>
            <Label>OpenAI API key</Label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
              <input type={showKey ? 'text' : 'password'} className="input-base pl-9 pr-11" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={settings.hasApiKey ? 'A local key is already configured' : 'sk-...'} autoComplete="off" />
              <button type="button" onClick={() => setShowKey((value) => !value)} className="absolute right-3 top-3 text-muted hover:text-ink" aria-label={showKey ? 'Hide API key' : 'Show API key'}>{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
            <p className="mt-1.5 text-xs text-muted">Leave this empty to retain the existing local key. It is never sent back to the browser after saving.</p>
          </div>
          <div className="sm:w-1/2">
            <Label>Default model</Label>
            <input className="input-base" value={model} onChange={(event) => setModel(event.target.value)} placeholder="gpt-5.6-luna" />
          </div>
          <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-canvas px-4 py-3">
            <div><p className="text-sm font-medium text-ink">Use for scribe drafts</p><p className="mt-0.5 text-xs text-muted">When enabled, a consented transcript is sent to OpenAI to prepare a clinician-review draft. If it fails or is disabled, GrowCare uses its local draft instead.</p></div>
            <Toggle checked={useForScribing} onChange={setUseForScribing} />
          </div>
          <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-canvas px-4 py-3">
            <div><p className="text-sm font-medium text-ink">Use for clinical intelligence</p><p className="mt-0.5 text-xs text-muted">When you explicitly process a source or refresh patient context, the selected clinical data is sent to OpenAI for a clinician-review draft. Files and extracted records remain local in GrowCare.</p></div>
            <Toggle checked={useForClinicalAI} onChange={setUseForClinicalAI} />
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">{message}</p>}
          <div className="flex flex-wrap gap-2">
            <Button loading={saving} leftIcon={message.startsWith('Saved') ? <Check className="h-4 w-4" /> : undefined} onClick={save}>Save local AI settings</Button>
            <Button variant="secondary" loading={testing} onClick={testConnection} disabled={!apiKey.trim() && !settings.hasApiKey}>Test OpenAI connection</Button>
            {settings.hasApiKey && <Button variant="ghost" loading={saving} leftIcon={<Trash2 className="h-4 w-4" />} onClick={clearKey}>Remove key</Button>}
          </div>
        </>}
      </Card.Body>
    </Card>
  )
}
