import { CalendarDays, MapPin, Plus, Trash2 } from 'lucide-react'
import { Label } from '../atoms'

const blankEvent = () => ({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  callType: '',
  locationName: '',
  locationAddress: '',
  latitude: '',
  longitude: '',
  extraGuestsAllowed: false,
  isCancelled: false,
  isScheduleCall: false,
})

export default function EventBuilder({ value, onChange }) {
  const event = value || null
  const update = (patch) => onChange({ ...event, ...patch })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Event message</Label>
        {!event ? (
          <button
            type="button"
            onClick={() => onChange(blankEvent())}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add event
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove event
          </button>
        )}
      </div>

      {!event ? (
        <p className="rounded-xl border border-dashed border-line bg-canvas px-3 py-3 text-sm text-muted">
          Send a WhatsApp event invite with a date, optional location, and optional call link type.
        </p>
      ) : (
        <div className="space-y-3 rounded-xl border border-line bg-canvas p-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <input
                className="input-base"
                placeholder="Event name"
                value={event.name || ''}
                onChange={(e) => update({ name: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <textarea
                className="input-base min-h-20"
                placeholder="Event description (optional)"
                value={event.description || ''}
                onChange={(e) => update({ description: e.target.value })}
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted">
                <CalendarDays className="h-3.5 w-3.5" />
                Start
              </div>
              <input
                type="datetime-local"
                className="input-base"
                value={event.startDate || ''}
                onChange={(e) => update({ startDate: e.target.value })}
              />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted">End (optional)</div>
              <input
                type="datetime-local"
                className="input-base"
                value={event.endDate || ''}
                onChange={(e) => update({ endDate: e.target.value })}
              />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted">Call link type (optional)</div>
              <select
                className="input-base"
                value={event.callType || ''}
                onChange={(e) => update({ callType: e.target.value })}
              >
                <option value="">No call link</option>
                <option value="audio">Audio call</option>
                <option value="video">Video call</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-line text-brand-600"
                  checked={Boolean(event.extraGuestsAllowed)}
                  onChange={(e) => update({ extraGuestsAllowed: e.target.checked })}
                />
                Extra guests allowed
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              Location (optional)
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="input-base md:col-span-2"
                placeholder="Location name"
                value={event.locationName || ''}
                onChange={(e) => update({ locationName: e.target.value })}
              />
              <input
                className="input-base md:col-span-2"
                placeholder="Address"
                value={event.locationAddress || ''}
                onChange={(e) => update({ locationAddress: e.target.value })}
              />
              <input
                className="input-base"
                placeholder="Latitude"
                value={event.latitude || ''}
                onChange={(e) => update({ latitude: e.target.value })}
              />
              <input
                className="input-base"
                placeholder="Longitude"
                value={event.longitude || ''}
                onChange={(e) => update({ longitude: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
