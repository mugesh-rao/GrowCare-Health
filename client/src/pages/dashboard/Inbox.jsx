/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, Bot, BotOff, Search, StickyNote, X, Plus, Trash2, MessageSquareText, UserRound } from 'lucide-react'
import { Button, Badge, Spinner, Label, Alert } from '../../components/atoms'
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
  const [deleteError, setDeleteError] = useState('')

  const load = useCallback(async () => {
    const params = {}
    if (filter !== 'all') params.status = filter
    if (query) params.q = query
    setConversations(await inboxService.conversations(params))
    setLoading(false)
  }, [filter, query])

  const deleteConversation = async (phone) => {
    setDeleteError('')
    await inboxService.deleteConversation(phone)
    setConversations((prev) => prev.filter((c) => c.phone !== phone))
    if (activePhone === phone) setActivePhone(null)
    await load()
  }

  useEffect(() => {
    load()
  }, [load])

  // Live refresh on new messages / handoffs.
  useRealtime((evt) => {
    if (['conversation', 'message', 'handoff'].includes(evt.type)) load()
  })

  const active = conversations.find((c) => c.phone === activePhone)

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[34rem] max-h-[48rem] gap-4 overflow-hidden rounded-[24px] border border-line bg-white p-3">
      {/* Conversations list */}
      <div className="flex min-h-0 w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="border-b border-line p-3">
          <div className="mb-4 flex items-center gap-3 px-1"><span className="grid h-9 w-9 place-items-center rounded-xl bg-night-900 text-white"><MessageSquareText className="h-4 w-4" /></span><div><p className="text-sm font-semibold text-ink">Care communications</p><p className="text-xs text-muted">Patient conversations</p></div></div>
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
        <div className="min-h-0 flex-1 overflow-y-auto">
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
                  setDeleteError('')
                  setActivePhone(c.phone)
                  inboxService.markRead(c.phone).then(load)
                }}
                className={
                  'flex w-full items-start gap-3 border-b border-line px-3.5 py-3 text-left transition hover:bg-canvas ' +
                  (activePhone === c.phone ? 'bg-brand-50/70 shadow-[inset_3px_0_0_0_#278b84]' : '')
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
          <Thread
            key={active.phone}
            conversation={active}
            onDelete={deleteConversation}
            deleteError={deleteError}
            setDeleteError={setDeleteError}
          />
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
    <div className="flex min-h-0 w-80 shrink-0 flex-col gap-5 overflow-y-auto rounded-2xl border border-line bg-surface p-4">
      {/* Bot control */}
      <div>
        <Label>Conversation owner</Label>
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
        <Label>Care status</Label>
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
        <Label>Care labels</Label>
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
            placeholder="Add care label"
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
          <Label>Patient reference</Label>
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
        <Label className="flex items-center gap-1"><StickyNote className="h-3.5 w-3.5" /> Care coordination notes</Label>
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
            placeholder="Add an internal handoff note"
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

function Thread({ conversation, onDelete, deleteError, setDeleteError }) {
  const phone = conversation.phone
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
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

  const remove = async () => {
    const label = conversation.name || `+${phone}`
    const ok = window.confirm(`Delete ${label} and all chat history? This cannot be undone.`)
    if (!ok) return

    setDeleting(true)
    setDeleteError('')
    try {
      await onDelete(phone)
    } catch (error) {
      setDeleteError(error.message || 'Unable to delete this conversation.')
      setDeleting(false)
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="font-semibold text-ink">{conversation.name || phone}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted"><UserRound className="h-3 w-3" />+{phone}<span className="text-line">•</span>Patient communication</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone[conversation.status || 'open']}>{conversation.status || 'open'}</Badge>
          <Button
            size="sm"
            variant="danger"
            loading={deleting}
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={remove}
          >
            Delete
          </Button>
        </div>
      </div>

      {deleteError && <Alert tone="error" className="m-3 mb-0">{deleteError}</Alert>}

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f6f7f4] p-5">
        {messages.map((m) => (
          <div key={m.id} className={'flex ' + (m.direction === 'out' ? 'justify-end' : 'justify-start')}>
            <div
              className={
                'max-w-[75%] rounded-2xl px-3 py-2 text-sm ' +
                (m.direction === 'out'
                  ? 'rounded-br-sm bg-night-900 text-white'
                  : 'rounded-bl-sm border border-line bg-white text-ink shadow-[0_1px_1px_rgba(16,24,40,0.02)]')
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
