import { Label } from '../atoms'
import ButtonBuilder from './ButtonBuilder'
import ImageSourceField from './ImageSourceField'

export default function HydratedTemplateBuilder({ value, onChange }) {
  const template = value || {
    title: '',
    text: '',
    footer: '',
    imageUrl: '',
    imageDataUrl: '',
    buttons: [],
  }

  const update = (patch) => onChange({ ...template, ...patch })

  return (
    <div className="space-y-3">
      <Label>Hydrated template</Label>
      <input
        className="input-base"
        placeholder="Header title (optional)"
        value={template.title || ''}
        onChange={(e) => update({ title: e.target.value })}
      />
      <textarea
        className="input-base min-h-24"
        placeholder="Template body text"
        value={template.text || ''}
        onChange={(e) => update({ text: e.target.value })}
      />
      <input
        className="input-base"
        placeholder="Footer text (optional)"
        value={template.footer || ''}
        onChange={(e) => update({ footer: e.target.value })}
      />
      <ImageSourceField
        label="Template header image"
        urlValue={template.imageUrl}
        dataUrlValue={template.imageDataUrl}
        onUrlChange={(imageUrl) => update({ imageUrl })}
        onDataUrlChange={(imageDataUrl) => update({ imageDataUrl })}
      />
      <ButtonBuilder
        value={template.buttons || []}
        onChange={(buttons) => update({ buttons })}
        allowedTypes={['quick_reply', 'cta_url', 'cta_call']}
        heading="Template buttons"
      />
    </div>
  )
}
