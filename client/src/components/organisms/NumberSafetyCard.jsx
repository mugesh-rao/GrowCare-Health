import { useEffect, useState } from 'react'
import { ShieldCheck, Check } from 'lucide-react'
import { Card, Button, Label, Spinner, Alert } from '../atoms'
import userService from '../../services/userService'

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-2">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ' +
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
    </label>
  )
}

/** Global number-safety (anti-ban) configuration. */
export default function NumberSafetyCard() {
  const [cfg, setCfg] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    userService.getAntiBan().then(({ config }) => setCfg(config))
  }, [])

  const set = (patch) => setCfg((c) => ({ ...c, ...patch }))

  const save = async () => {
    setSaving(true)
    try {
      const updated = await userService.updateAntiBan(cfg)
      setCfg(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <Card.Header className="flex items-center gap-2">
        <ShieldCheck className="h-4.5 w-4.5 text-brand-600" />
        <span className="font-semibold text-ink">Number Safety (anti-ban)</span>
      </Card.Header>
      <Card.Body className="space-y-4">
        {!cfg ? (
          <div className="grid place-items-center py-6">
            <Spinner className="h-6 w-6 text-brand-600" />
          </div>
        ) : (
          <>
            <Alert tone="info">
              These protections reduce the risk of your WhatsApp number being banned.
              We recommend keeping them on, especially for bulk sending.
            </Alert>

            <div className="divide-y divide-line">
              <Toggle
                label="Enable protection"
                hint="Master switch for all anti-ban behavior."
                checked={cfg.enabled}
                onChange={(v) => set({ enabled: v })}
              />
              <Toggle
                label="Human typing & delays"
                hint="Shows a typing indicator and waits a randomized time before each send."
                checked={cfg.humanTyping}
                onChange={(v) => set({ humanTyping: v })}
              />
              <Toggle
                label="Message variation (spintax)"
                hint="Expands {hi|hello|hey} so bulk messages aren't byte-identical."
                checked={cfg.spintax}
                onChange={(v) => set({ spintax: v })}
              />
              <Toggle
                label="Warm-up new numbers"
                hint="Ramps the daily send limit over the first 7 days."
                checked={cfg.warmup}
                onChange={(v) => set({ warmup: v })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Max sends / day</Label>
                <input
                  type="number" min="1" className="input-base"
                  value={cfg.maxPerDay}
                  onChange={(e) => set({ maxPerDay: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Min delay (ms)</Label>
                <input
                  type="number" min="0" className="input-base"
                  value={cfg.minDelayMs}
                  onChange={(e) => set({ minDelayMs: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Max delay (ms)</Label>
                <input
                  type="number" min="0" className="input-base"
                  value={cfg.maxDelayMs}
                  onChange={(e) => set({ maxDelayMs: Number(e.target.value) })}
                />
              </div>
            </div>

            <Button
              loading={saving}
              leftIcon={saved ? <Check className="h-4 w-4" /> : undefined}
              onClick={save}
            >
              {saved ? 'Saved' : 'Save safety settings'}
            </Button>
          </>
        )}
      </Card.Body>
    </Card>
  )
}
