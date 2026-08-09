import { useCallback, useEffect, useRef, useState } from 'react'
import { Wifi, Laptop, UserPlus, Check, X, Trash2, RadioTower } from 'lucide-react'
import { Card, Button, Label, Badge, Alert, Spinner } from '../atoms'
import useRealtime from '../../hooks/useRealtime'
import networkService from '../../services/networkService'

const POLL_MS = 3000

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        'relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ' +
        (checked ? 'bg-brand-600' : 'bg-slate-300')
      }
    >
      <span
        className={
          'absolute top-0.5 h-5 w-5 rounded-full bg-white transition ' +
          (checked ? 'left-[22px]' : 'left-0.5')
        }
      />
    </button>
  )
}

/**
 * Network pairing — devices on the same hotspot/LAN discover each other and
 * pair with mutual consent (Accept/Decline). Off by default; pairing only
 * builds a trusted device list here, it doesn't share patient/WhatsApp data.
 */
export default function NetworkPairingCard() {
  const [status, setStatus] = useState(null)
  const [discovered, setDiscovered] = useState([])
  const [pending, setPending] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [paired, setPaired] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState('')

  const [nameDraft, setNameDraft] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const s = await networkService.status()
      setStatus(s)
      if (s.enabled) {
        const [d, p, o, pr] = await Promise.all([
          networkService.discovered(),
          networkService.pending(),
          networkService.outgoing(),
          networkService.paired(),
        ])
        setDiscovered(d)
        setPending(p)
        setOutgoing(o)
        setPaired(pr)
      } else {
        setDiscovered([])
        setPending([])
        setOutgoing([])
        setPaired([])
      }
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  const noticeTimer = useRef()
  useRealtime((evt) => {
    if (evt.type === 'network-declined') {
      clearTimeout(noticeTimer.current)
      setNotice(`${evt.deviceName || 'The device'} declined the pairing request.`)
      noticeTimer.current = setTimeout(() => setNotice(''), 4000)
      refresh()
    } else if (['network-status', 'network-pending', 'network-paired'].includes(evt.type)) {
      refresh()
    }
  })

  const toggleEnabled = async (enabled) => {
    setToggling(true)
    try {
      setStatus(await networkService.setEnabled(enabled))
      await refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setToggling(false)
    }
  }

  const startEditName = () => {
    setNameDraft(status?.deviceName || '')
    setEditingName(true)
  }
  const saveName = async () => {
    setSavingName(true)
    try {
      setStatus(await networkService.setDeviceName(nameDraft.trim()))
      setEditingName(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingName(false)
    }
  }

  const runAction = async (id, fn) => {
    setBusyId(id)
    try {
      await fn()
      await refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId('')
    }
  }

  const outgoingByDeviceId = new Map(outgoing.map((o) => [o.toDeviceId, o]))

  return (
    <Card>
      <Card.Header className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold text-ink">
          <Wifi className="h-4.5 w-4.5 text-brand-600" /> Network pairing
        </span>
        {status && <Toggle checked={status.enabled} onChange={toggleEnabled} disabled={toggling} />}
      </Card.Header>
      <Card.Body className="space-y-5">
        <Alert tone="info">
          Turn this on when this PC and your team's PCs are on the same Wi-Fi hotspot or
          network. Each device only appears here for the others to invite — nothing is
          shared until a device explicitly accepts a pairing request.
        </Alert>

        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="info">{notice}</Alert>}

        {loading ? (
          <div className="grid place-items-center py-8">
            <Spinner className="h-6 w-6 text-brand-600" />
          </div>
        ) : !status?.enabled ? (
          <p className="text-sm text-muted">
            Network pairing is off. Turn it on to discover and pair with other GrowCare
            devices on this hotspot/network.
          </p>
        ) : (
          <div className="space-y-6">
            {/* This device */}
            <div className="rounded-xl border border-line bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">This device</p>
              {editingName ? (
                <div className="mt-2 flex items-end gap-2">
                  <div className="flex-1">
                    <Label>Device name</Label>
                    <input
                      className="input-base"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      maxLength={60}
                    />
                  </div>
                  <Button size="md" loading={savingName} onClick={saveName}>
                    Save
                  </Button>
                  <Button size="md" variant="secondary" onClick={() => setEditingName(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="mt-1 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink">{status.deviceName}</p>
                    <p className="text-sm text-muted">
                      {status.localIp ? `${status.localIp} · ` : ''}visible to other devices on this network
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={startEditName}>
                    Rename
                  </Button>
                </div>
              )}
            </div>

            {/* Incoming pairing requests */}
            {pending.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Incoming requests
                </p>
                <div className="divide-y divide-line">
                  {pending.map((req) => (
                    <div key={req.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="font-medium text-ink">{req.fromDeviceName}</p>
                        <p className="text-sm text-muted">{req.fromHost} wants to pair with this device</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          leftIcon={<Check className="h-4 w-4" />}
                          loading={busyId === req.id}
                          onClick={() => runAction(req.id, () => networkService.accept(req.id))}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<X className="h-4 w-4" />}
                          disabled={busyId === req.id}
                          onClick={() => runAction(req.id, () => networkService.decline(req.id))}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby devices */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                <RadioTower className="h-3.5 w-3.5" /> Nearby devices
              </p>
              {discovered.length === 0 ? (
                <p className="text-sm text-muted">
                  No other GrowCare devices found on this network yet. Make sure they've
                  joined the same hotspot and turned pairing on too.
                </p>
              ) : (
                <div className="divide-y divide-line">
                  {discovered.map((d) => {
                    const invited = outgoingByDeviceId.has(d.deviceId)
                    return (
                      <div key={d.deviceId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2.5">
                          <Laptop className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="font-medium text-ink">{d.deviceName}</p>
                            <p className="text-sm text-muted">{d.host}</p>
                          </div>
                        </div>
                        {invited ? (
                          <Badge tone="warning">Invited — waiting</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<UserPlus className="h-4 w-4" />}
                            loading={busyId === d.deviceId}
                            onClick={() => runAction(d.deviceId, () => networkService.invite(d.deviceId))}
                          >
                            Invite to pair
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Paired devices */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Paired devices</p>
              {paired.length === 0 ? (
                <p className="text-sm text-muted">No paired devices yet.</p>
              ) : (
                <div className="divide-y divide-line">
                  {paired.map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2.5">
                        <Laptop className="h-4 w-4 text-brand-500" />
                        <div>
                          <p className="font-medium text-ink">{d.deviceName}</p>
                          <p className="text-sm text-muted">{d.host}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="success">Paired</Badge>
                        <button
                          title="Remove pairing"
                          disabled={busyId === d.id}
                          onClick={() => runAction(d.id, () => networkService.revoke(d.id))}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
