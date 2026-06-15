import { useId } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'

export default function ImageSourceField({
  label = 'Image',
  urlValue = '',
  dataUrlValue = '',
  onUrlChange,
  onDataUrlChange,
}) {
  const inputId = useId()
  const previewSrc = dataUrlValue || urlValue || ''

  const onFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onDataUrlChange(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="rounded-xl border border-line bg-canvas p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <input
        className="input-base mb-2"
        placeholder="https://example.com/image.jpg"
        value={urlValue || ''}
        onChange={(e) => onUrlChange(e.target.value)}
      />
      <div className="mb-2 flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line bg-white px-3 py-2 text-sm text-ink hover:border-brand-400 hover:bg-brand-50/40"
        >
          <ImagePlus className="h-4 w-4 text-brand-600" />
          <span>Upload image</span>
        </label>
        {dataUrlValue && (
          <button
            type="button"
            onClick={() => onDataUrlChange('')}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Remove uploaded image"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <input id={inputId} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {previewSrc && (
        <img
          src={previewSrc}
          alt={`${label} preview`}
          className="mt-2 h-28 w-full rounded-lg border border-line object-cover"
        />
      )}
    </div>
  )
}
