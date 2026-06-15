import { Plus, Trash2, MousePointerClick, Link2, Copy, Phone } from 'lucide-react'
import { Label } from '../atoms'

/**
 * ButtonBuilder — configure WhatsApp interactive buttons.
 * value: array of { type, label, id?, url?, copyCode?, phoneNumber? }
 * Used in the workflow Send node, Bulk Messaging, and Templates.
 */
const TYPES = [
  { type: 'quick_reply', label: 'Quick reply', Icon: MousePointerClick },
  { type: 'cta_url', label: 'Open URL', Icon: Link2 },
  { type: 'cta_copy', label: 'Copy code', Icon: Copy },
  { type: 'cta_call', label: 'Call number', Icon: Phone },
]

const blank = (type) => ({ type, label: '' })

export default function ButtonBuilder({ value = [], onChange, allowedTypes, heading = 'Interactive buttons' }) {
  const buttons = value || []
  const visibleTypes = Array.isArray(allowedTypes) && allowedTypes.length
    ? TYPES.filter((item) => allowedTypes.includes(item.type))
    : TYPES

  const add = (type) => onChange([...buttons, blank(type)])
  const update = (i, patch) =>
    onChange(buttons.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))
  const remove = (i) => onChange(buttons.filter((_, idx) => idx !== i))

  return (
    <div>
      <Label>{heading}</Label>

      <div className="space-y-2.5">
        {buttons.map((b, i) => {
          const meta = TYPES.find((t) => t.type === b.type)
          return (
            <div key={i} className="rounded-xl border border-line bg-canvas p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
                  {meta?.Icon && <meta.Icon className="h-3.5 w-3.5" />}
                  {meta?.label || b.type}
                </span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Remove button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <input
                className="input-base mb-2"
                placeholder="Button label (e.g. Visit site)"
                value={b.label || ''}
                onChange={(e) => update(i, { label: e.target.value })}
              />

              {b.type === 'quick_reply' && (
                <input
                  className="input-base"
                  placeholder="Reply payload id (sent back on tap)"
                  value={b.id || ''}
                  onChange={(e) => update(i, { id: e.target.value })}
                />
              )}
              {b.type === 'cta_url' && (
                <input
                  className="input-base"
                  placeholder="https://example.com"
                  value={b.url || ''}
                  onChange={(e) => update(i, { url: e.target.value })}
                />
              )}
              {b.type === 'cta_copy' && (
                <input
                  className="input-base"
                  placeholder="Code to copy (e.g. SAVE20)"
                  value={b.copyCode || ''}
                  onChange={(e) => update(i, { copyCode: e.target.value })}
                />
              )}
              {b.type === 'cta_call' && (
                <input
                  className="input-base"
                  placeholder="+1234567890"
                  value={b.phoneNumber || ''}
                  onChange={(e) => update(i, { phoneNumber: e.target.value })}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {visibleTypes.map(({ type, label, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => add(type)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-medium text-ink transition hover:border-brand-400 hover:bg-brand-50"
          >
            <Plus className="h-3.5 w-3.5" /> <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>
    </div>
  )
}
