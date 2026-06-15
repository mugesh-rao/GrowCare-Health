import { Plus, Trash2 } from 'lucide-react'
import { Label } from '../atoms'
import ButtonBuilder from './ButtonBuilder'
import ImageSourceField from './ImageSourceField'

const emptyCard = () => ({
  caption: '',
  footer: '',
  imageUrl: '',
  imageDataUrl: '',
  buttons: [{ type: 'cta_url', label: '', url: '' }],
})

export default function CarouselBuilder({ value, onChange }) {
  const carousel = value || { cards: [emptyCard()] }
  const cards = Array.isArray(carousel.cards) && carousel.cards.length ? carousel.cards : [emptyCard()]

  const update = (patch) => onChange({ ...carousel, cards, ...patch })
  const updateCard = (index, patch) =>
    update({ cards: cards.map((card, i) => (i === index ? { ...card, ...patch } : card)) })
  const addCard = () => update({ cards: [...cards, emptyCard()] })
  const removeCard = (index) => update({ cards: cards.filter((_, i) => i !== index) })

  return (
    <div className="space-y-3">
      <Label>Carousel</Label>
      <p className="text-xs text-muted">
        Experimental. Each card supports an image, caption, footer, and native-flow-style actions.
      </p>
      {cards.map((card, index) => (
        <div key={index} className="rounded-xl border border-line bg-canvas p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-700">Card {index + 1}</span>
            {cards.length > 1 && (
              <button
                type="button"
                onClick={() => removeCard(index)}
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Remove card"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <textarea
            className="input-base mb-2 min-h-20"
            placeholder="Card caption"
            value={card.caption || ''}
            onChange={(e) => updateCard(index, { caption: e.target.value })}
          />
          <input
            className="input-base mb-2"
            placeholder="Card footer (optional)"
            value={card.footer || ''}
            onChange={(e) => updateCard(index, { footer: e.target.value })}
          />
          <ImageSourceField
            label={`Card ${index + 1} image`}
            urlValue={card.imageUrl}
            dataUrlValue={card.imageDataUrl}
            onUrlChange={(imageUrl) => updateCard(index, { imageUrl })}
            onDataUrlChange={(imageDataUrl) => updateCard(index, { imageDataUrl })}
          />
          <div className="mt-3">
            <ButtonBuilder
              value={card.buttons || []}
              onChange={(buttons) => updateCard(index, { buttons })}
              heading="Card actions"
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addCard}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Add card
      </button>
    </div>
  )
}
