import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Bot, BotOff, Search, StickyNote, X, Plus } from 'lucide-react'
import { Button, Badge, Spinner, Label } from '../../components/atoms'
import useRealtime from '../../hooks/useRealtime'
import inboxService from '../../services/inboxService'

const STATUSES = ['open', 'pending', 'closed']
const statusTone = { open: 'success', pending: 'warning', closed: 'neutral' }

export default function Inbox() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [activePhone, setActivePhone] = useState(null)

  const load = useCallback(async () => {
    const params = {}
    if (filter !== 'all') params.status = filter
    if (query) params.q = query
    setConversations(await inboxService.conversations(params))
    setLoading(false)
  }, [filter, query])

  useEffect(() => {
    load()
  }, [load])

  // Live refresh on new messages / handoffs.
  useRealtime((evt) => {
    if (['conversation', 'message', 'handoff'].includes(evt.type)) load()
  })

  const active = conversations.find((c) => c.phone === activePhone)

  return (
    <div className="flex min-h-[42rem] gap-4">
      {/* Conversations list */}
      <div className="flex w-72 shrink-0 flex-col rounded-2xl border border-line bg-surface">
        <div className="border-b border-line p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input-base pl-9"
              placeholder="Search name or number"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="mt-2 flex gap-1">
            {['all', ...STATUSES].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={
                  'rounded-lg px-2 py-1 text-xs font-medium capitalize transition ' +
                  (filter === s ? 'bg-brand-600 text-white' : 'text-muted hover:bg-slate-100')
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid place-items-center py-10">
              <Spinner className="h-6 w-6 text-brand-600" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">No patient conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.phone}
                onClick={() => {
                  setActivePhone(c.phone)
                  inboxService.markRead(c.phone).then(load)
                }}
                className={
                  'flex w-full items-start gap-2 border-b border-line px-3 py-2.5 text-left transition hover:bg-slate-50 ' +
                  (activePhone === c.phone ? 'bg-brand-50' : '')
                }
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {(c.name || 'U').charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-1">
                    <span className="truncate text-sm font-semibold text-ink">{c.name || c.phone}</span>
                    {c.unread > 0 && (
                      <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">{c.unread}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.status === 'pending' ? '#d97706' : c.status === 'closed' ? '#94a3b8' : '#16a34a' }} />
                    <span className="truncate text-xs text-muted">{c.lastMessage || '—'}</span>
                    {c.botPaused && <BotOff className="h-3 w-3 shrink-0 text-amber-500" />}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Thread + details */}
      {active ? (
        <>
          <Thread key={active.phone} conversation={active} onChanged={load} />
          <Details key={'d-' + active.phone} conversation={active} onChanged={load} />
        </>
      ) : (
        <div className="grid flex-1 place-items-center rounded-2xl border border-line bg-surface text-sm text-muted">
          Select a conversation
        </div>
      )}
    </div>
  )
}

function Details({ conversation, onChanged }) {
  const phone = conversation.phone
  const [tags, setTags] = useState(conversation.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [notes, setNotes] = useState([])
  const [noteInput, setNoteInput] = useState('')

  useEffect(() => {
    setTags(conversation.tags || [])
    inboxService.notes(phone).then(setNotes)
  }, [phone, conversation.tags])

  const patch = async (p) => {
    await inboxService.update(phone, p)
    onChanged()
  }
  const addTag = async () => {
    const t = tagInput.trim()
    if (!t || tags.includes(t)) return
    const next = [...tags, t]
    setTags(next)
    setTagInput('')
    patch({ tags: next })
  }
  const removeTag = (t) => {
    const next = tags.filter((x) => x !== t)
    setTags(next)
    patch({ tags: next })
  }
  const addNote = async () => {
    if (!noteInput.trim()) return
    const n = await inboxService.addNote(phone, noteInput.trim())
    setNotes((prev) => [...prev, n])
    setNoteInput('')
  }

  const attrs = conversation.attributes || {}

  return (
    <div className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-surface p-4">
      {/* Bot control */}
      <div>
        <Label>Automation</Label>
        <Button
          fullWidth
          variant={conversation.botPaused ? 'primary' : 'secondary'}
          leftIcon={conversation.botPaused ? <Bot className="h-4 w-4" /> : <BotOff className="h-4 w-4" />}
          onClick={() => patch({ botPaused: !conversation.botPaused })}
        >
          {conversation.botPaused ? 'Resume bot' : 'Pause bot for this chat'}
        </Button>
      </div>

      {/* Status */}
      <div>
        <Label>Status</Label>
        <select
          className="input-base"
          value={conversation.status || 'open'}
          onChange={(e) => patch({ status: e.target.value })}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <Label>Tags</Label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              {t}
              <button onClick={() => removeTag(t)}><X className="h-3 w-3" /></button>
            </span>
          ))}
          {tags.length === 0 && <span className="text-xs text-muted">No tags</span>}
        </div>
        <div className="flex gap-1.5">
          <input
            className="input-base"
            placeholder="Add tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
          />
          <Button size="md" variant="secondary" onClick={addTag}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Attributes (CRM-lite) */}
      {Object.keys(attrs).length > 0 && (
        <div>
          <Label>Details</Label>
          <div className="space-y-1 rounded-xl border border-line bg-canvas p-2.5 text-sm">
            {Object.entries(attrs).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="text-muted">{k}</span>
                <span className="font-medium text-ink">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <Label className="flex items-center gap-1"><StickyNote className="h-3.5 w-3.5" /> Internal notes</Label>
        <div className="mb-2 space-y-1.5">
          {notes.map((n) => (
            <div key={n.id} className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
              {n.body}
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            className="input-base"
            placeholder="Add a note"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
          />
          <Button size="md" variant="secondary" onClick={addNote}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  )
}

function Thread({ conversation, onChanged }) {
  const phone = conversation.phone
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)

  const loadMessages = useCallback(async () => {
    setMessages(await inboxService.messages(phone))
  }, [phone])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useRealtime((evt) => {
    if (evt.type === 'message' && evt.message?.contactId === phone) loadMessages()
  })

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages])

  const send = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      await inboxService.reply(phone, { text: text.trim() })
      setText('')
      loadMessages()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-line bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="font-semibold text-ink">{conversation.name || phone}</p>
          <p className="text-xs text-muted">+{phone}</p>
        </div>
        <Badge tone={statusTone[conversation.status || 'open']}>{conversation.status || 'open'}</Badge>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-canvas p-4">
        {messages.map((m) => (
          <div key={m.id} className={'flex ' + (m.direction === 'out' ? 'justify-end' : 'justify-start')}>
            <div
              className={
                'max-w-[75%] rounded-2xl px-3 py-2 text-sm ' +
                (m.direction === 'out'
                  ? 'rounded-br-sm bg-brand-600 text-white'
                  : 'rounded-bl-sm border border-line bg-white text-ink')
              }
            >
              {m.body}
              {m.agent && <span className="ml-2 text-[10px] opacity-70">· agent</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          className="input-base max-h-32 min-h-11 flex-1 resize-none"
          placeholder="Type a reply… (the bot pauses while you chat)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <Button loading={sending} leftIcon={<Send className="h-4 w-4" />} onClick={send}>
          Send
        </Button>
      </div>
    </div>
  )
}
