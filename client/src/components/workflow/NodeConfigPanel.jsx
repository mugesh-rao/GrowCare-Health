import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Label } from '../atoms'
import ButtonBuilder from '../organisms/ButtonBuilder'
import CarouselBuilder from '../organisms/CarouselBuilder'
import ExternalAdReplyBuilder from '../organisms/ExternalAdReplyBuilder'
import EventBuilder from '../organisms/EventBuilder'
import HydratedTemplateBuilder from '../organisms/HydratedTemplateBuilder'
import ListBuilder from '../organisms/ListBuilder'
import { inferSendMode, sanitizeSendPayload } from '../../lib/sendPayload'
import templateService from '../../services/templateService'
import AINodeConfig from './AINodeConfig'
import AIRouterConfig from './AIRouterConfig'
import CatalogNodeConfig from './CatalogNodeConfig'

const toSendNodeData = (payload = {}) => ({
  sendMode: payload.sendMode || 'text',
  message: payload.text || '',
  footer: payload.footer || '',
  title: payload.title || '',
  buttons: payload.buttons || [],
  list: payload.list || null,
  event: payload.event || null,
  externalAdReply: payload.externalAdReply || null,
  template: payload.template || null,
  product: payload.product || null,
  carousel: payload.carousel || null,
})

export default function NodeConfigPanel({ node, nodes = [], edges = [], onChange, onDelete }) {
  const [templates, setTemplates] = useState([])

  useEffect(() => {
    let cancelled = false
    templateService
      .list()
      .then((items) => {
        if (!cancelled) setTemplates(items.filter((item) => inferSendMode(item) !== 'product'))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  if (!node) {
    return (
      <div className="p-5 text-sm text-muted">
        Select a node to configure it, or add one from the palette.
      </div>
    )
  }

  const data = node.data || {}
  const update = (patch) => onChange({ ...data, ...patch })
  const routeTargets = (Array.isArray(edges) ? edges : [])
    .filter((edge) => edge?.source === node.id && edge?.sourceHandle)
    .reduce((acc, edge) => {
      const targetNode = (Array.isArray(nodes) ? nodes : []).find((item) => item.id === edge.target)
      if (!targetNode) return acc
      const title =
        targetNode.type === 'send'
          ? targetNode.data?.message || 'Send Message'
          : targetNode.type === 'booking'
            ? targetNode.data?.service || 'Booking'
            : targetNode.type === 'ai'
              ? 'AI Reply'
              : targetNode.type === 'handoff'
                ? 'Human Handoff'
                : targetNode.type === 'payment'
                  ? targetNode.data?.label || 'Payment Link'
                  : targetNode.type === 'catalog'
                    ? 'Legacy catalog'
                    : targetNode.type === 'api'
                      ? targetNode.data?.url || 'API Request'
                      : targetNode.type === 'set'
                        ? targetNode.data?.field || 'Set Field'
                        : targetNode.type === 'schedule'
                          ? 'Schedule Reminder'
                          : targetNode.type === 'condition'
                            ? targetNode.data?.keyword || 'Condition'
                            : targetNode.type
      acc[edge.sourceHandle] = title
      return acc
    }, {})
  const sendMode = inferSendMode({
    sendMode: data.sendMode,
    text: data.message,
    footer: data.footer,
    title: data.title,
    buttons: data.buttons,
    list: data.list,
    event: data.event,
    externalAdReply: data.externalAdReply,
    template: data.template,
    product: data.product,
    carousel: data.carousel,
  })

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
      update({
        ...base,
        message: '',
      })
      return
    }

    update(base)
  }

  const apiHeaders = Array.isArray(data.headers) ? data.headers : []
  const updateHeader = (index, patch) =>
    update({
      headers: apiHeaders.map((header, i) => (i === index ? { ...header, ...patch } : header)),
    })
  const addHeader = () => update({ headers: [...apiHeaders, { key: '', value: '' }] })
  const removeHeader = (index) =>
    update({ headers: apiHeaders.filter((_, i) => i !== index) })

  const applyTemplateToNode = (templateId) => {
    const template = templates.find((item) => item.id === templateId)
    if (!template) return
    update(toSendNodeData(sanitizeSendPayload(template)))
  }

  return (
    <div className="space-y-4 p-5">
      <div>
        <p className="eyebrow">{node.type}</p>
        <h3 className="font-display text-lg font-bold text-ink">Node settings</h3>
      </div>

      {node.type === 'trigger' && (
        <p className="text-sm text-muted">
          Fires whenever a new WhatsApp message arrives. Connect it to the next step.
        </p>
      )}

      {node.type === 'condition' && (
        <>
          <div>
            <Label>Match type</Label>
            <select
              className="input-base"
              value={data.matchType || 'contains'}
              onChange={(e) => update({ matchType: e.target.value })}
            >
              <option value="contains">Message contains</option>
              <option value="equals">Message equals</option>
              <option value="startsWith">Message starts with</option>
            </select>
          </div>
          <div>
            <Label>Keyword / phrase</Label>
            <input
              className="input-base"
              placeholder="e.g. price"
              value={data.keyword || ''}
              onChange={(e) => update({ keyword: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-muted">
              Case-insensitive. The MATCH branch runs on a hit, NO MATCH otherwise.
            </p>
          </div>
        </>
      )}

      {node.type === 'ai' && <AINodeConfig data={data} update={update} />}

      {node.type === 'router' && (
        <AIRouterConfig
          data={data}
          update={update}
          routeTargets={routeTargets}
        />
      )}

      {node.type === 'send' && (
        <>
          {templates.length > 0 && (
            <div>
              <Label>Load saved template</Label>
              <select
                key={node.id}
                className="input-base"
                defaultValue=""
                onChange={(e) => applyTemplateToNode(e.target.value)}
              >
                <option value="" disabled>Choose a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted">
                Reuse any saved dashboard template and apply it to this send node.
              </p>
            </div>
          )}

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

          {sendMode !== 'event' && sendMode !== 'template' && (
            <>
              <div>
                <Label>Message to send</Label>
                <textarea
                  className="input-base min-h-24"
                  placeholder="Hi! Thanks for reaching out"
                  value={data.message || ''}
                  onChange={(e) => update({ message: e.target.value })}
                />
                <p className="mt-1.5 text-xs text-muted">
                  {sendMode === 'text'
                    ? 'Plain text reply.'
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
                    placeholder="GrowCare Clinic"
                    value={data.footer || ''}
                    onChange={(e) => update({ footer: e.target.value })}
                  />
                </div>
              )}
            </>
          )}

          {sendMode === 'buttons' && (
            <ButtonBuilder
              value={data.buttons || []}
              onChange={(buttons) => update({ buttons })}
            />
          )}

          {sendMode === 'list' && (
            <ListBuilder
              value={data.list}
              onChange={(list) => update({ list })}
            />
          )}

          {sendMode === 'event' && (
            <EventBuilder
              value={data.event}
              onChange={(event) => update({ event })}
            />
          )}

          {sendMode === 'ad' && (
            <ExternalAdReplyBuilder
              value={data.externalAdReply}
              onChange={(externalAdReply) => update({ externalAdReply })}
            />
          )}

          {sendMode === 'template' && (
            <HydratedTemplateBuilder
              value={data.template}
              onChange={(template) => update({ template })}
            />
          )}

          {sendMode === 'carousel' && (
            <CarouselBuilder
              value={data.carousel}
              onChange={(carousel) => update({ carousel })}
            />
          )}
        </>
      )}

      {node.type === 'api' && (
        <>
          <div>
            <Label required>API URL</Label>
            <input
              className="input-base"
              placeholder="https://example-crm.com/api/leads"
              value={data.url || ''}
              onChange={(e) => update({ url: e.target.value })}
            />
          </div>
          <div>
            <Label>Method</Label>
            <select
              className="input-base"
              value={data.method || 'POST'}
              onChange={(e) => update({ method: e.target.value })}
            >
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="GET">GET</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label>Headers</Label>
              <button
                type="button"
                onClick={addHeader}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add header
              </button>
            </div>
            <div className="space-y-2">
              {apiHeaders.map((header, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    className="input-base"
                    placeholder="Header name"
                    value={header.key || ''}
                    onChange={(e) => updateHeader(index, { key: e.target.value })}
                  />
                  <input
                    className="input-base"
                    placeholder="Header value"
                    value={header.value || ''}
                    onChange={(e) => updateHeader(index, { value: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => removeHeader(index)}
                    className="shrink-0 rounded-lg px-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Remove header"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label>Body template</Label>
            <textarea
              className="input-base min-h-32"
              placeholder={'{\n  "name": "{{name}}",\n  "phone": "{{phone}}",\n  "message": "{{message}}"\n}'}
              value={data.bodyTemplate || ''}
              onChange={(e) => update({ bodyTemplate: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-muted">
              Use variables like{' '}
              <code className="rounded bg-slate-100 px-1">{'{{name}}'}</code>,{' '}
              <code className="rounded bg-slate-100 px-1">{'{{phone}}'}</code>,{' '}
              <code className="rounded bg-slate-100 px-1">{'{{message}}'}</code>, and{' '}
              <code className="rounded bg-slate-100 px-1">{'{{sessionId}}'}</code>.
            </p>
          </div>
          <div>
            <Label>Save response as</Label>
            <input
              className="input-base"
              placeholder="api"
              value={data.saveAs || ''}
              onChange={(e) => update({ saveAs: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-muted">
              The JSON response is captured — use it in later nodes as{' '}
              <code className="rounded bg-slate-100 px-1">{'{{api.field}}'}</code> (live data from your DB/store).
            </p>
          </div>
        </>
      )}

      {node.type === 'delay' && (
        <div>
          <Label>Delay (seconds)</Label>
          <input
            type="number"
            min="0"
            className="input-base w-32"
            value={data.seconds || 0}
            onChange={(e) => update({ seconds: Number(e.target.value) })}
          />
        </div>
      )}

      {node.type === 'booking' && (
        <>
          <div>
            <Label>What is being booked?</Label>
            <input className="input-base" placeholder="appointment / site visit / table" value={data.service || ''} onChange={(e) => update({ service: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Days ahead</Label><input type="number" min="1" className="input-base" value={data.daysAhead ?? 5} onChange={(e) => update({ daysAhead: Number(e.target.value) })} /></div>
            <div><Label>Slot length (min)</Label><input type="number" min="15" step="15" className="input-base" value={data.intervalMins ?? 30} onChange={(e) => update({ intervalMins: Number(e.target.value) })} /></div>
            <div><Label>Open hour</Label><input type="number" min="0" max="23" className="input-base" value={data.startHour ?? 9} onChange={(e) => update({ startHour: Number(e.target.value) })} /></div>
            <div><Label>Close hour</Label><input type="number" min="1" max="24" className="input-base" value={data.endHour ?? 18} onChange={(e) => update({ endHour: Number(e.target.value) })} /></div>
          </div>
          <div>
            <Label>Reminder (hours before)</Label>
            <input type="number" min="0" className="input-base w-32" value={data.reminderHours ?? 24} onChange={(e) => update({ reminderHours: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Prompt message</Label>
            <input className="input-base" placeholder="Pick a time for your appointment:" value={data.message || ''} onChange={(e) => update({ message: e.target.value })} />
          </div>
          <p className="text-xs text-muted">
            Offers a slot list. When the customer picks one, it confirms, saves the booking
            (see <b>Bookings</b> page), and schedules a reminder automatically.
          </p>
        </>
      )}

      {node.type === 'payment' && (
        <>
          <div>
            <Label>Message</Label>
            <input className="input-base" value={data.message || ''} onChange={(e) => update({ message: e.target.value })} placeholder="Complete your payment 👇" />
          </div>
          <div>
            <Label>Payment link</Label>
            <input className="input-base" placeholder="https://rzp.io/l/…  or  {{api.paymentUrl}}" value={data.linkTemplate || ''} onChange={(e) => update({ linkTemplate: e.target.value })} />
            <p className="mt-1.5 text-xs text-muted">
              Paste a Razorpay/Stripe link, or use{' '}
              <code className="rounded bg-slate-100 px-1">{'{{api.field}}'}</code> from an API node
              that creates the link.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Button label</Label><input className="input-base" value={data.label || ''} onChange={(e) => update({ label: e.target.value })} placeholder="Pay now" /></div>
            <div><Label>Amount (optional)</Label><input className="input-base" value={data.amount || ''} onChange={(e) => update({ amount: e.target.value })} placeholder="999" /></div>
          </div>
        </>
      )}

      {node.type === 'catalog' && <CatalogNodeConfig data={data} update={update} />}

      {node.type === 'set' && (
        <>
          <div>
            <Label>Field name</Label>
            <input
              className="input-base"
              placeholder="e.g. budget, department, cart"
              value={data.field || ''}
              onChange={(e) => update({ field: e.target.value })}
            />
          </div>
          <div>
            <Label>Value</Label>
            <input
              className="input-base"
              placeholder="{{message}}  or  {{api.total}}"
              value={data.value || ''}
              onChange={(e) => update({ value: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-muted">
              Saved to the contact (visible in the Team Inbox) and usable later as{' '}
              <code className="rounded bg-slate-100 px-1">{`{{field}}`}</code>.
            </p>
          </div>
        </>
      )}

      {node.type === 'schedule' && (
        <>
          <div>
            <Label>Send after (seconds)</Label>
            <input
              type="number"
              min="0"
              className="input-base w-40"
              value={data.seconds || 0}
              onChange={(e) => update({ seconds: Number(e.target.value) })}
            />
            <p className="mt-1.5 text-xs text-muted">86400 = 1 day · 3600 = 1 hour.</p>
          </div>
          <div>
            <Label>Reminder message</Label>
            <textarea
              className="input-base min-h-20"
              placeholder="Hi {{name}}, your appointment is tomorrow at 10am."
              value={data.message || ''}
              onChange={(e) => update({ message: e.target.value })}
            />
          </div>
        </>
      )}

      {node.type === 'handoff' && (
        <>
          <p className="text-sm text-muted">
            Pauses the bot for this contact and marks the chat <b>pending</b> in the
            Team Inbox so a human can take over (with full history). Resume the bot
            anytime from the inbox.
          </p>
          <div>
            <Label>Reason (for the inbox)</Label>
            <input
              className="input-base"
              placeholder="e.g. requested, complaint, payment"
              value={data.reason || ''}
              onChange={(e) => update({ reason: e.target.value })}
            />
          </div>
          <div>
            <Label>Internal note</Label>
            <textarea
              className="input-base min-h-20"
              placeholder="Context for the agent picking this up…"
              value={data.note || ''}
              onChange={(e) => update({ note: e.target.value })}
            />
          </div>
          <p className="text-xs text-muted">
            Tip: put a Condition before this node (keyword <b>agent</b> / <b>human</b>),
            and a Send Message (&quot;connecting you to a person…&quot;) just before it.
          </p>
        </>
      )}

      {node.type !== 'trigger' && (
        <button onClick={onDelete} className="text-sm font-medium text-red-600 hover:underline">
          Delete node
        </button>
      )}
    </div>
  )
}
