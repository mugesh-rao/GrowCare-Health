import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, FileText } from 'lucide-react'
import { Card, Button, Badge, Spinner, Modal, Label, Alert } from '../../components/atoms'
import ButtonBuilder from '../../components/organisms/ButtonBuilder'
import CarouselBuilder from '../../components/organisms/CarouselBuilder'
import ExternalAdReplyBuilder from '../../components/organisms/ExternalAdReplyBuilder'
import EventBuilder from '../../components/organisms/EventBuilder'
import HydratedTemplateBuilder from '../../components/organisms/HydratedTemplateBuilder'
import ListBuilder from '../../components/organisms/ListBuilder'
import useHeaderActions from '../../hooks/useHeaderActions'
import { inferSendMode, sanitizeSendPayload } from '../../lib/sendPayload'
import { sampleTemplateList } from '../../lib/messageTemplates'
import templateService from '../../services/templateService'

const empty = {
  name: '',
  sendMode: 'text',
  title: '',
  text: '',
  footer: '',
  buttons: [],
  list: null,
  event: null,
  externalAdReply: null,
  template: null,
  product: null,
  carousel: null,
}

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [samples, setSamples] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)

  useHeaderActions(
    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ ...empty })}>
      New template
    </Button>,
  )

  const load = () =>
    templateService
      .list()
      .then((items) => setTemplates(items.filter((template) => inferSendMode(template) !== 'product')))

  useEffect(() => {
    setSamples(sampleTemplateList())
    load().finally(() => setLoading(false))
  }, [])

  const remove = async (id) => {
    await templateService.remove(id)
    setTemplates((prev) => prev.filter((template) => template.id !== id))
  }

  const onSaved = (saved) => {
    setTemplates((prev) => {
      const filtered = prev.filter((template) => template.id !== saved.id)
      return [...filtered, saved]
    })
    setEditing(null)
  }

  return (
    <>
      {loading ? (
        <div className="grid place-items-center py-20">
          <Spinner className="h-8 w-8 text-brand-600" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <Card.Body className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <FileText className="h-6 w-6" />
            </span>
            <div>
              <p className="font-semibold text-ink">No templates yet</p>
              <p className="text-sm text-muted">
                Save reusable patient reminders, intake prompts, and follow-up replies.
              </p>
            </div>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ ...empty })}>
              Create a template
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const mode = inferSendMode(template)
            const preview = sanitizeSendPayload(template)
            return (
              <Card key={template.id}>
                <Card.Body className="flex h-full flex-col">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="font-semibold text-ink">{template.name}</p>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => setEditing(template)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(template.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="line-clamp-3 flex-1 text-sm text-muted">
                    {mode === 'event'
                      ? preview.event?.name || 'Event message'
                      : mode === 'ad'
                        ? preview.externalAdReply?.title || preview.text || 'External ad reply'
                        : mode === 'template'
                          ? preview.template?.title || preview.template?.text || 'Hydrated template'
                          : mode === 'carousel'
                            ? preview.text || 'Carousel message'
                            : preview.text || '-'}
                  </p>
                  {mode === 'buttons' && preview.buttons?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {preview.buttons.map((button, index) => (
                        <Badge key={index} tone="brand">
                          {button.label || button.type}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {mode === 'list' && preview.list?.sections?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge tone="success">List: {preview.list.buttonText || 'Select'}</Badge>
                    </div>
                  )}
                  {mode === 'event' && preview.event?.name && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge tone="warning">Event: {preview.event.name}</Badge>
                    </div>
                  )}
                  {mode === 'ad' && preview.externalAdReply?.title && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge tone="brand">Ad: {preview.externalAdReply.title}</Badge>
                    </div>
                  )}
                  {mode === 'template' && preview.template?.buttons?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge tone="brand">
                        Template: {preview.template.buttons.length} button
                        {preview.template.buttons.length === 1 ? '' : 's'}
                      </Badge>
                    </div>
                  )}
                  {mode === 'carousel' && preview.carousel?.cards?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge tone="warning">
                        Carousel: {preview.carousel.cards.length} card
                        {preview.carousel.cards.length === 1 ? '' : 's'}
                      </Badge>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )
          })}
        </div>
      )}

      {editing && (
        <TemplateEditor
          template={editing}
          samples={samples}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
    </>
  )
}

function TemplateEditor({ template, samples = [], onClose, onSaved }) {
  const [form, setForm] = useState({ ...empty, ...template })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (patch) => setForm((current) => ({ ...current, ...patch }))
  const sendMode = inferSendMode(form)

  const applySample = (sampleId) => {
    const sample = samples.find((item) => item.id === sampleId)
    if (!sample) return
    const payload = JSON.parse(JSON.stringify(sample.payload || {}))
    setForm({ ...empty, ...payload, name: payload.name || sample.name })
    setError('')
  }

  const changeSendMode = (nextMode) => {
    const base = {
      sendMode: nextMode,
      footer: '',
      title: '',
      buttons: [],
      list: null,
      event: null,
      externalAdReply: null,
      template: null,
      product: null,
      carousel: null,
    }

    if (nextMode === 'event' || nextMode === 'template') {
      set({
        ...base,
        text: '',
      })
      return
    }

    set(base)
  }

  const save = async () => {
    if (!form.name.trim()) return setError('Give the template a name.')

    const payload = sanitizeSendPayload(form)
    if (
      !payload.text.trim() &&
      !(payload.buttons || []).length &&
      !payload.list &&
      !payload.event &&
      !payload.externalAdReply &&
      !payload.template &&
      !payload.carousel
    ) {
      return setError('Add one supported message payload before saving.')
    }
    if (payload.externalAdReply && !payload.text.trim()) {
      return setError('External ad reply message text is required.')
    }

    setError('')
    setSaving(true)
    try {
      const body = {
        name: form.name,
        sendMode: payload.sendMode,
        title: payload.title,
        text: payload.text,
        footer: payload.footer,
        buttons: payload.buttons,
        list: payload.list,
        event: payload.event,
        externalAdReply: payload.externalAdReply,
        template: payload.template,
        carousel: payload.carousel,
      }
      const saved = template.id
        ? await templateService.update(template.id, body)
        : await templateService.create(body)
      onSaved(saved)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={template.id ? 'Edit template' : 'New template'} className="max-w-lg">
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div>
          <Label required>Template name</Label>
          <input
            className="input-base"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Appointment reminder"
          />
        </div>
        <div>
          <Label>Send type</Label>
          <select
            className="input-base"
            value={sendMode}
            onChange={(e) => changeSendMode(e.target.value)}
          >
            <option value="text">Text message</option>
            <option value="buttons">Buttons</option>
            <option value="list">List</option>
            <option value="event">Event</option>
            <option value="ad">External ad reply</option>
            <option value="template">Hydrated template</option>
            <option value="carousel">Carousel</option>
          </select>
        </div>
        {samples.length > 0 && (
          <div>
            <Label>Load sample template</Label>
            <select
              className="input-base"
              defaultValue=""
              onChange={(e) => {
                applySample(e.target.value)
                e.target.value = ''
              }}
            >
              <option value="" disabled>
                Choose a sample...
              </option>
              {samples.map((sample) => (
                <option key={sample.id} value={sample.id}>
                  {sample.name} ({sample.type})
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-muted">
              Samples come from the clinic template library and fill the fields below for testing.
            </p>
          </div>
        )}

        {sendMode !== 'event' && sendMode !== 'template' && (
          <>
            <div>
              <Label>Message</Label>
              <textarea
                className="input-base min-h-24"
                placeholder="Hi {{name}}, this is a reminder for your visit tomorrow."
                value={form.text}
                onChange={(e) => set({ text: e.target.value })}
              />
              <p className="mt-1.5 text-xs text-muted">
                {sendMode === 'text'
                  ? 'Plain text template.'
                  : sendMode === 'ad'
                    ? 'Main message text shown above the ad preview.'
                    : sendMode === 'carousel'
                      ? 'Optional text shown above the carousel.'
                      : 'Optional text shown above the interactive content.'}
              </p>
            </div>
            {sendMode !== 'text' && sendMode !== 'ad' && (
              <div>
                <Label>Footer (optional)</Label>
                <input
                  className="input-base"
                  value={form.footer}
                  onChange={(e) => set({ footer: e.target.value })}
                  placeholder="GrowCare Clinic"
                />
              </div>
            )}
          </>
        )}

        {sendMode === 'buttons' && (
          <ButtonBuilder value={form.buttons} onChange={(buttons) => set({ buttons })} />
        )}
        {sendMode === 'list' && <ListBuilder value={form.list} onChange={(list) => set({ list })} />}
        {sendMode === 'event' && <EventBuilder value={form.event} onChange={(event) => set({ event })} />}
        {sendMode === 'ad' && (
          <ExternalAdReplyBuilder
            value={form.externalAdReply}
            onChange={(externalAdReply) => set({ externalAdReply })}
          />
        )}
        {sendMode === 'template' && (
          <HydratedTemplateBuilder value={form.template} onChange={(templateValue) => set({ template: templateValue })} />
        )}
        {sendMode === 'carousel' && (
          <CarouselBuilder value={form.carousel} onChange={(carousel) => set({ carousel })} />
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button fullWidth loading={saving} onClick={save}>
            Save template
          </Button>
        </div>
      </div>
    </Modal>
  )
}
