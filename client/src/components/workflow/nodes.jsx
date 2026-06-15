import { Handle, Position } from '@xyflow/react'
import {
  MessageSquare,
  GitBranch,
  Sparkles,
  Send,
  Clock,
  Globe,
  UserCheck,
  Package,
  Tag,
  BellRing,
  CalendarClock,
  CreditCard,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { inferSendMode } from '../../lib/sendPayload'

const dot = {
  width: 11,
  height: 11,
  background: '#16a34a',
  border: '2px solid #fff',
}

const defaultRouterRoutes = [
  { id: 'route_1', label: 'Route 1', description: '' },
  { id: 'route_2', label: 'Route 2', description: '' },
  { id: 'route_3', label: 'Route 3', description: '' },
  { id: 'route_4', label: 'Route 4', description: '' },
  { id: 'fallback', label: 'Fallback', description: 'Use this path when no route matches or confidence is low.' },
]

function getRouterRoutes(data = {}) {
  const routes = Array.isArray(data?.routes) ? data.routes : []
  return defaultRouterRoutes.map((route) => {
    const match = routes.find((item) => item?.id === route.id)
    return { ...route, ...match }
  })
}

function Shell({ accent, chip, Icon, title, children, selected }) {
  return (
    <div
      className={cn(
        'w-60 overflow-hidden rounded-xl border bg-white transition',
        selected ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-line',
      )}
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <span className={cn('grid h-7 w-7 place-items-center rounded-lg', chip)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="ml-auto h-2 w-2 rounded-full" style={{ background: accent }} />
      </div>
      <div className="px-3 py-2.5 text-xs text-muted">{children}</div>
    </div>
  )
}

export function TriggerNode({ data, selected }) {
  return (
    <Shell
      accent="#16a34a"
      chip="bg-brand-100 text-brand-700"
      Icon={MessageSquare}
      title="Message Trigger"
      selected={selected}
    >
      {data?.label || 'When a WhatsApp message is received'}
      <Handle type="source" position={Position.Bottom} style={dot} />
    </Shell>
  )
}

export function ConditionNode({ data, selected }) {
  const mode = data?.matchType || 'contains'
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} style={dot} />
      <Shell
        accent="#0b1410"
        chip="bg-night-900 text-brand-400"
        Icon={GitBranch}
        title="Condition"
        selected={selected}
      >
        Text {mode} <b className="text-ink">{data?.keyword || '- set keyword -'}</b>
        <div className="mt-2 flex justify-between text-[10px] font-semibold">
          <span className="text-brand-600">MATCH</span>
          <span className="text-red-500">NO MATCH</span>
        </div>
      </Shell>
      <Handle id="true" type="source" position={Position.Bottom} style={{ ...dot, left: '25%' }} />
      <Handle
        id="false"
        type="source"
        position={Position.Bottom}
        style={{ ...dot, left: '75%', background: '#ef4444' }}
      />
    </div>
  )
}

export function AINode({ data, selected }) {
  return (
    <>
      <Handle type="target" position={Position.Top} style={dot} />
      <Shell
        accent="#16a34a"
        chip="bg-night-900 text-brand-400"
        Icon={Sparkles}
        title="AI Reply"
        selected={selected}
      >
        {data?.model ? (
          <span className="text-ink">
            {data.provider || 'AI'} - {data.model}
          </span>
        ) : (
          'Generate a smart reply'
        )}
        {data?.systemPrompt && (
          <p className="mt-1 line-clamp-2 text-slate-400">{data.systemPrompt}</p>
        )}
      </Shell>
      <Handle type="source" position={Position.Bottom} style={dot} />
    </>
  )
}

export function RouterNode({ data, selected }) {
  const routes = getRouterRoutes(data)
  const fallbackId = data?.fallbackRoute || 'fallback'

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} style={dot} />
      <Shell
        accent="#0f766e"
        chip="bg-teal-100 text-teal-700"
        Icon={Sparkles}
        title="AI Router"
        selected={selected}
      >
        <span className="text-ink">
          {data?.model ? `${data.provider || 'AI'} - ${data.model}` : 'Route to the best next step'}
        </span>
        <div className="mt-1.5 space-y-1">
          {routes.map((route) => (
            <div
              key={route.id}
              className={cn(
                'rounded border px-1.5 py-1 text-[10px] font-medium',
                route.id === fallbackId
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-teal-200 bg-teal-50 text-teal-700',
              )}
            >
              <span className="text-ink">{route.label || route.id}</span>
              {route.id === fallbackId && ' - fallback'}
            </div>
          ))}
        </div>
        {data?.systemPrompt && (
          <p className="mt-2 line-clamp-2 text-slate-400">{data.systemPrompt}</p>
        )}
      </Shell>
      {routes.map((route, index) => (
        <Handle
          key={route.id}
          id={route.id}
          type="source"
          position={Position.Bottom}
          style={{
            ...dot,
            left: `${10 + index * 20}%`,
            background: route.id === fallbackId ? '#f59e0b' : '#0f766e',
          }}
        />
      ))}
    </div>
  )
}

export function SendNode({ data, selected }) {
  const sendMode = inferSendMode({
    sendMode: data?.sendMode,
    text: data?.message,
    footer: data?.footer,
    title: data?.title,
    buttons: data?.buttons,
    list: data?.list,
    event: data?.event,
    externalAdReply: data?.externalAdReply,
    template: data?.template,
    product: data?.product,
    carousel: data?.carousel,
  })
  const carouselCards = Array.isArray(data?.carousel?.cards) ? data.carousel.cards : []
  const previewText =
    sendMode === 'event'
      ? data?.event?.name || '- set event -'
      : sendMode === 'ad'
        ? data?.externalAdReply?.title || data?.message || '- set ad reply -'
        : sendMode === 'template'
          ? data?.template?.title || data?.template?.text || '- set template -'
          : sendMode === 'product'
            ? data?.product?.title || data?.product?.body || '- legacy product card -'
            : sendMode === 'carousel'
              ? data?.message || '- set carousel -'
              : data?.message || '- set message -'

  return (
    <>
      <Handle type="target" position={Position.Top} style={dot} />
      <Shell
        accent="#15803d"
        chip="bg-brand-100 text-brand-700"
        Icon={Send}
        title="Send Message"
        selected={selected}
      >
        {previewText}
        {sendMode === 'buttons' && data?.buttons?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {data.buttons.map((button, index) => (
              <span
                key={index}
                className="rounded border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700"
              >
                {button.label || button.type}
              </span>
            ))}
          </div>
        )}
        {sendMode === 'list' && data?.list?.sections?.length > 0 && (
          <div className="mt-1.5">
            <span className="rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
              List: {data.list.buttonText || 'Select'}
            </span>
          </div>
        )}
        {sendMode === 'event' && data?.event?.name && (
          <div className="mt-1.5">
            <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
              Event: {data.event.name}
            </span>
          </div>
        )}
        {sendMode === 'ad' && data?.externalAdReply?.title && (
          <div className="mt-1.5">
            <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
              Ad: {data.externalAdReply.title}
            </span>
          </div>
        )}
        {sendMode === 'template' && data?.template?.buttons?.length > 0 && (
          <div className="mt-1.5">
            <span className="rounded border border-fuchsia-200 bg-fuchsia-50 px-1.5 py-0.5 text-[10px] font-medium text-fuchsia-700">
              Template: {data.template.buttons.length} button
              {data.template.buttons.length === 1 ? '' : 's'}
            </span>
          </div>
        )}
        {sendMode === 'product' && data?.product?.title && (
          <div className="mt-1.5">
            <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
              Legacy: {data.product.title}
            </span>
          </div>
        )}
        {sendMode === 'carousel' && carouselCards.length > 0 && (
          <div className="mt-1.5">
            <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
              Carousel: {carouselCards.length} card{carouselCards.length === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </Shell>
      <Handle type="source" position={Position.Bottom} style={dot} />
    </>
  )
}

export function DelayNode({ data, selected }) {
  return (
    <>
      <Handle type="target" position={Position.Top} style={dot} />
      <Shell
        accent="#64746c"
        chip="bg-slate-100 text-slate-600"
        Icon={Clock}
        title="Delay"
        selected={selected}
      >
        Wait {data?.seconds || 0}s before continuing
      </Shell>
      <Handle type="source" position={Position.Bottom} style={dot} />
    </>
  )
}

export function BookingNode({ data, selected }) {
  return (
    <>
      <Handle type="target" position={Position.Top} style={dot} />
      <Shell accent="#0ea5e9" chip="bg-sky-100 text-sky-700" Icon={CalendarClock} title="Booking" selected={selected}>
        <span className="text-ink">Book a {data?.service || 'appointment'}</span>
        <p className="mt-1 line-clamp-2 text-slate-400">
          Offers slots, confirms, and reminds ({data?.reminderHours ?? 24}h before).
        </p>
      </Shell>
      <Handle type="source" position={Position.Bottom} style={dot} />
    </>
  )
}

export function PaymentNode({ data, selected }) {
  return (
    <>
      <Handle type="target" position={Position.Top} style={dot} />
      <Shell accent="#16a34a" chip="bg-emerald-100 text-emerald-700" Icon={CreditCard} title="Payment Link" selected={selected}>
        <span className="text-ink">{data?.label || 'Pay now'}</span>
        {data?.amount && <span className="text-slate-400"> - {data?.currency || 'Rs'}{data.amount}</span>}
      </Shell>
      <Handle type="source" position={Position.Bottom} style={dot} />
    </>
  )
}

export function CatalogNode({ data, selected }) {
  const count = Array.isArray(data?.productIds) ? data.productIds.length : 0
  return (
    <>
      <Handle type="target" position={Position.Top} style={dot} />
      <Shell accent="#16a34a" chip="bg-brand-100 text-brand-700" Icon={Package} title="Legacy Catalog" selected={selected}>
        <span className="text-ink">{count ? `${count} stored item${count === 1 ? '' : 's'}` : 'Legacy catalog node'}</span>
        <p className="mt-1 line-clamp-2 text-slate-400">Replace this with a list, buttons, or carousel for clinic mode.</p>
      </Shell>
      <Handle type="source" position={Position.Bottom} style={dot} />
    </>
  )
}

export function SetFieldNode({ data, selected }) {
  return (
    <>
      <Handle type="target" position={Position.Top} style={dot} />
      <Shell accent="#7c3aed" chip="bg-violet-100 text-violet-700" Icon={Tag} title="Set Field" selected={selected}>
        <span className="text-ink">{data?.field || '- field -'}</span> = {data?.value || '...'}
      </Shell>
      <Handle type="source" position={Position.Bottom} style={dot} />
    </>
  )
}

export function ScheduleNode({ data, selected }) {
  return (
    <>
      <Handle type="target" position={Position.Top} style={dot} />
      <Shell accent="#d97706" chip="bg-amber-100 text-amber-700" Icon={BellRing} title="Schedule Reminder" selected={selected}>
        After {data?.seconds || 0}s: {data?.message || '- message -'}
      </Shell>
      <Handle type="source" position={Position.Bottom} style={dot} />
    </>
  )
}

export function HandoffNode({ data, selected }) {
  return (
    <>
      <Handle type="target" position={Position.Top} style={dot} />
      <Shell
        accent="#d97706"
        chip="bg-amber-100 text-amber-700"
        Icon={UserCheck}
        title="Human Handoff"
        selected={selected}
      >
        <span className="text-ink">Pause bot and assign to a human</span>
        <p className="mt-1 line-clamp-2 text-slate-400">
          {data?.note || 'Marks the chat as pending in the Team Inbox.'}
        </p>
      </Shell>
    </>
  )
}

export function ApiNode({ data, selected }) {
  return (
    <>
      <Handle type="target" position={Position.Top} style={dot} />
      <Shell
        accent="#0f766e"
        chip="bg-teal-100 text-teal-700"
        Icon={Globe}
        title="API Request"
        selected={selected}
      >
        <div className="font-medium text-ink">
          {(data?.method || 'POST').toUpperCase()} {data?.url || ' set endpoint'}
        </div>
        <p className="mt-1 line-clamp-2 text-slate-400">
          Push lead data to your CRM or webhook.
        </p>
      </Shell>
      <Handle type="source" position={Position.Bottom} style={dot} />
    </>
  )
}
