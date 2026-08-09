import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Mail, ShieldCheck, Smartphone, Plus, Power, Trash2, Check, Globe, User, Wifi } from 'lucide-react'
import { Card, Button, Label, Badge, Alert, Spinner } from '../../components/atoms'
import ConnectWhatsAppModal from '../../components/organisms/ConnectWhatsAppModal'
import NumberSafetyCard from '../../components/organisms/NumberSafetyCard'
import NetworkPairingCard from '../../components/organisms/NetworkPairingCard'
import useRealtime from '../../hooks/useRealtime'
import { useProfile } from '../../context/ProfileContext'
import userService from '../../services/userService'
import waService from '../../services/waService'

const healthTone = { good: 'success', moderate: 'warning', high: 'danger' }

const statusTone = {
  connected: 'success',
  qr: 'warning',
  connecting: 'warning',
  reconnecting: 'warning',
  logged_out: 'danger',
  disconnected: 'neutral',
}
const statusLabel = {
  connected: 'Connected',
  qr: 'Scan QR',
  connecting: 'Connecting',
  reconnecting: 'Reconnecting',
  logged_out: 'Logged out',
  disconnected: 'Disconnected',
}

const tabs = [
  { id: 'profile', label: 'My Information', Icon: User },
  { id: 'whatsapp', label: 'WhatsApp Connection', Icon: Smartphone },
  { id: 'safety', label: 'Safety', Icon: ShieldCheck },
  { id: 'network', label: 'Network Pairing', Icon: Wifi },
]
const validTabs = new Set(tabs.map((t) => t.id))

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = validTabs.has(searchParams.get('tab')) ? searchParams.get('tab') : 'profile'

  const { user, refreshProfile } = useProfile()

  // Profile
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [businessType, setBusinessType] = useState(user?.businessType || '')
  const [savedProfile, setSavedProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  // Sessions
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showConnect, setShowConnect] = useState(false)

  useEffect(() => {
    setName(user?.name || '')
    setEmail(user?.email || '')
    setBusinessType(user?.businessType || '')
  }, [user])

  const loadSessions = useCallback(async () => {
    try {
      setSessions(await waService.list())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useRealtime((evt) => {
    if (evt.type === 'status') {
      setSessions((prev) =>
        prev.map((s) => (s.id === evt.sessionId ? { ...s, status: evt.status } : s)),
      )
    }
  })

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      await userService.updateProfile({ name, email, businessType })
      await refreshProfile()
      setSavedProfile(true)
      setTimeout(() => setSavedProfile(false), 2000)
    } finally {
      setSavingProfile(false)
    }
  }

  const logoutSession = async (id) => {
    await waService.logout(id)
    loadSessions()
  }
  const removeSession = async (id) => {
    await waService.remove(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  // Proxy editing (anti-ban: per-number IP)
  const [proxyEdit, setProxyEdit] = useState(null) // { id, value }
  const [savingProxy, setSavingProxy] = useState(false)
  const saveProxy = async () => {
    setSavingProxy(true)
    try {
      await waService.setProxy(proxyEdit.id, proxyEdit.value.trim())
      setProxyEdit(null)
      loadSessions()
    } finally {
      setSavingProxy(false)
    }
  }

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">Local workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-ink">Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Manage your clinic profile, WhatsApp connections, number safety, and paired devices.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {tabs.map(({ id, label, Icon }) => {
            const active = id === activeTab
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSearchParams(id === 'profile' ? {} : { tab: id })}
                className={
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ' +
                  (active
                    ? 'border-night-900 bg-night-900 text-white'
                    : 'border-line bg-white text-ink hover:border-brand-300 hover:bg-brand-50')
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            )
          })}
        </div>

        {activeTab === 'profile' && (
          <Card>
            <Card.Header>
              <span className="font-semibold text-ink">Your information</span>
            </Card.Header>
            <Card.Body className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Full name</Label>
                  <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <div className="relative"><Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" /><input className="input-base pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" /></div>
                </div>
              </div>
              <div className="sm:w-1/2 sm:pr-2">
                <Label>Clinic type</Label>
                <input
                  className="input-base"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  placeholder="e.g. Dental clinic"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  loading={savingProfile}
                  leftIcon={savedProfile ? <Check className="h-4 w-4" /> : undefined}
                  onClick={saveProfile}
                >
                  {savedProfile ? 'Saved' : 'Save changes'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}

        {activeTab === 'whatsapp' && (
          <Card>
            <Card.Header className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-semibold text-ink">
                <Smartphone className="h-4.5 w-4.5 text-brand-600" /> WhatsApp connections
              </span>
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowConnect(true)}>
                Connect WhatsApp
              </Button>
            </Card.Header>
            <Card.Body className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p>QR pairing is generated locally. If it does not appear, use the retry option in the connection dialog; session diagnostics are shown there.</p></div>
              {loading ? (
                <div className="grid place-items-center py-8">
                  <Spinner className="h-6 w-6 text-brand-600" />
                </div>
              ) : sessions.length === 0 ? (
                <Alert tone="info">
                  No WhatsApp numbers connected yet. Click "Connect WhatsApp" and scan the QR with your phone.
                </Alert>
              ) : (
                <div className="divide-y divide-line">
                  {sessions.map((s) => (
                    <div key={s.id} className="py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-ink">{s.label}</p>
                          <p className="text-sm text-muted">{s.phone ? `+${s.phone}` : 'Not paired'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={statusTone[s.status] || 'neutral'}>
                            {statusLabel[s.status] || s.status}
                          </Badge>
                          {s.status === 'connected' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<Power className="h-4 w-4" />}
                              onClick={() => logoutSession(s.id)}
                            >
                              Disconnect
                            </Button>
                          )}
                          <button
                            title="Remove"
                            onClick={() => removeSession(s.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Number safety read-out */}
                      {s.health && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                          <Badge tone={healthTone[s.health.level] || 'neutral'}>
                            Risk: {s.health.level}
                          </Badge>
                          <span className="text-muted">
                            Sent today {s.health.sentToday}/{s.health.dailyCap}
                          </span>
                          {s.health.warmupActive && (
                            <span className="text-muted">· Warm-up day {s.health.warmupDay}/7</span>
                          )}
                          <button
                            onClick={() =>
                              setProxyEdit(
                                proxyEdit?.id === s.id ? null : { id: s.id, value: s.proxyUrl || '' },
                              )
                            }
                            className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            {s.proxyUrl ? 'Proxy set' : 'Add proxy'}
                          </button>
                        </div>
                      )}

                      {proxyEdit?.id === s.id && (
                        <div className="mt-2.5 flex items-end gap-2">
                          <div className="flex-1">
                            <Label>Proxy URL (optional)</Label>
                            <input
                              className="input-base"
                              placeholder="socks5://user:pass@host:port  or  http://host:port"
                              value={proxyEdit.value}
                              onChange={(e) => setProxyEdit({ id: s.id, value: e.target.value })}
                            />
                          </div>
                          <Button size="md" loading={savingProxy} onClick={saveProxy}>
                            Save
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {activeTab === 'safety' && <NumberSafetyCard />}

        {activeTab === 'network' && <NetworkPairingCard />}
      </div>

      <ConnectWhatsAppModal
        open={showConnect}
        onClose={() => {
          setShowConnect(false)
          loadSessions()
        }}
        onConnected={loadSessions}
      />
    </>
  )
}
