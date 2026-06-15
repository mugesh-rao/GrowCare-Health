import { useId } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Label } from '../atoms'

export default function ExternalAdReplyBuilder({ value, onChange }) {
  const inputId = useId()
  const adReply = value || {
    title: '',
    body: '',
    url: '',
    thumbnailUrl: '',
    thumbnailDataUrl: '',
    largeThumbnail: false,
    showAdAttribution: false,
  }

  const update = (patch) => onChange({ ...adReply, ...patch })

  const onFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      update({
        thumbnailDataUrl: typeof reader.result === 'string' ? reader.result : '',
      })
    }
    reader.readAsDataURL(file)
  }

  const previewSrc = adReply.thumbnailDataUrl || adReply.thumbnailUrl || ''

  return (
    <div className="space-y-3">
      <Label>External ad reply</Label>

      <input
        className="input-base"
        placeholder="Ad title"
        value={adReply.title || ''}
        onChange={(e) => update({ title: e.target.value })}
      />
      <input
        className="input-base"
        placeholder="Ad body (optional)"
        value={adReply.body || ''}
        onChange={(e) => update({ body: e.target.value })}
      />
      <input
        className="input-base"
        placeholder="Destination URL (optional)"
        value={adReply.url || ''}
        onChange={(e) => update({ url: e.target.value })}
      />
      <input
        className="input-base"
        placeholder="Thumbnail image URL"
        value={adReply.thumbnailUrl || ''}
        onChange={(e) => update({ thumbnailUrl: e.target.value })}
      />

      <div className="rounded-xl border border-line bg-canvas p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Thumbnail upload
          </span>
          {adReply.thumbnailDataUrl && (
            <button
              type="button"
              onClick={() => update({ thumbnailDataUrl: '' })}
              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
              title="Remove uploaded thumbnail"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <label
          htmlFor={inputId}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line bg-white px-3 py-2 text-sm text-ink hover:border-brand-400 hover:bg-brand-50/40"
        >
          <ImagePlus className="h-4 w-4 text-brand-600" />
          <span>Upload thumbnail image</span>
        </label>
        <input id={inputId} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <p className="mt-2 text-xs text-muted">
          Use a small image. Uploaded thumbnails are saved inside the workflow or template data.
        </p>
        {previewSrc && (
          <img
            src={previewSrc}
            alt="Ad thumbnail preview"
            className="mt-3 h-28 w-full rounded-lg border border-line object-cover"
          />
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-line text-brand-600"
          checked={Boolean(adReply.largeThumbnail)}
          onChange={(e) => update({ largeThumbnail: e.target.checked })}
        />
        Large thumbnail
      </label>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-line text-brand-600"
          checked={Boolean(adReply.showAdAttribution)}
          onChange={(e) => update({ showAdAttribution: e.target.checked })}
        />
        Show ad attribution
      </label>
    </div>
  )
}
