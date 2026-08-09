import { useEffect, useState } from 'react'
import { Server, Check } from 'lucide-react'
import { Card, Button, Label, Badge, Alert } from '../atoms'
import { getLocalServerConfig, setLocalServerPort, isTauri, DEFAULT_PORT } from '../../lib/localServer'

function portFromUrl(url) {
  try {
    return Number(new URL(url).port) || DEFAULT_PORT
  } catch {
    return DEFAULT_PORT
  }
}

/**
 * Local server connection — every API/WhatsApp/WS call in the app goes
 * through this port. Surfacing it (and letting it be changed) turns a
 * confusing "everything 404s" mismatch into one visible, fixable setting.
 */
export default function LocalServerCard() {
  const [currentPort, setCurrentPort] = useState(null)
  const [portDraft, setPortDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const tauriMode = isTauri()

  useEffect(() => {
    getLocalServerConfig().then((cfg) => {
      const port = portFromUrl(cfg.baseUrl)
      setCurrentPort(port)
      setPortDraft(String(port))
    })
  }, [])

  const save = async () => {
    const port = Number(portDraft)
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      setError('Enter a port between 1024 and 65535.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const { config, needsReload } = await setLocalServerPort(port)
      if (needsReload) {
        window.location.reload()
        return
      }
      setCurrentPort(portFromUrl(config.baseUrl))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <Card.Header className="flex items-center gap-2">
        <Server className="h-4.5 w-4.5 text-brand-600" />
        <span className="font-semibold text-ink">Local server</span>
      </Card.Header>
      <Card.Body className="space-y-4">
        <Alert tone="info">
          Every screen in GrowCare — including the WhatsApp QR and network pairing — talks to
          this one local port. If it ever gets out of sync (another app already using it, for
          example), change it here rather than editing config files.
        </Alert>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex items-end gap-3">
          <div className="w-40">
            <Label>Port</Label>
            <input
              className="input-base"
              type="number"
              min={1024}
              max={65535}
              value={portDraft}
              onChange={(e) => setPortDraft(e.target.value)}
            />
          </div>
          <Button
            loading={saving}
            leftIcon={saved ? <Check className="h-4 w-4" /> : undefined}
            onClick={save}
            disabled={currentPort !== null && Number(portDraft) === currentPort}
          >
            {saved ? 'Reconnected' : tauriMode ? 'Save & restart server' : 'Save (reloads page)'}
          </Button>
          {currentPort && <Badge tone="success">Currently on {currentPort}</Badge>}
        </div>
      </Card.Body>
    </Card>
  )
}
