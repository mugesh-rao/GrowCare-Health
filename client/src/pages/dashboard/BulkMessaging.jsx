import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileSpreadsheet, X, Download, Send } from 'lucide-react'
import { Card, Button, Label, Alert, Badge, Spinner } from '../../components/atoms'
import ButtonBuilder from '../../components/organisms/ButtonBuilder'
import CarouselBuilder from '../../components/organisms/CarouselBuilder'
import ExternalAdReplyBuilder from '../../components/organisms/ExternalAdReplyBuilder'
import EventBuilder from '../../components/organisms/EventBuilder'
import HydratedTemplateBuilder from '../../components/organisms/HydratedTemplateBuilder'
import ListBuilder from '../../components/organisms/ListBuilder'
import { inferSendMode, sanitizeSendPayload } from '../../lib/sendPayload'
import waService from '../../services/waService'
import templateService from '../../services/templateService'
import {
  parseRecipientsFile,
  applyTemplate,
  downloadSampleFile,
  sleep,
} from '../../lib/parseRecipients'

export default function BulkMessaging() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const [sessionId, setSessionId] = useState('')
  const [recipients, setRecipients] = useState([])
  const [columns, setColumns] = useState([])
  const [fileName, setFileName] = useState('')
  const [manual, setManual] = useState('')
  const [sendMode, setSendMode] = useState('text')
  const [text, setText] = useState('')
  const [footer, setFooter] = useState('')
  const [buttons, setButtons] = useState([])
  const [listMessage, setListMessage] = useState(null)
  const [eventMessage, setEventMessage] = useState(null)
  const [externalAdReply, setExternalAdReply] = useState(null)
  const [templateMessage, setTemplateMessage] = useState(null)
  const [carouselMessage, setCarouselMessage] = useState(null)
  const [templates, setTemplates] = useState([])
  const [delaySec, setDelaySec] = useState(3)
  const [error, setError] = useState('')

  const [phase, setPhase] = useState('config')
  const [progress, setProgress] = useState({ done: 0, sent: 0, failed: [] })
  const cancelRef = useRef(false)

  useEffect(() => {
    waService
      .list()
      .then((items) => {
        setSessions(items)
        const connected = items.find((session) => session.status === 'connected')
        if (connected) setSessionId(connected.id)
      })
      .finally(() => setLoading(false))

    templateService
      .list()
      .then((items) => setTemplates(items.filter((item) => inferSendMode(item) !== 'product')))
      .catch(() => {})
  }, [])

  const connected = sessions.filter((session) => session.status === 'connected')

  const applyNormalizedPayload = (payload) => {
    setSendMode(payload.sendMode)
    setText(payload.text || '')
    setFooter(payload.footer || '')
    setButtons(payload.buttons || [])
    setListMessage(payload.list || null)
    setEventMessage(payload.event || null)
    setExternalAdReply(payload.externalAdReply || null)
    setTemplateMessage(payload.template || null)
    setCarouselMessage(payload.carousel || null)
  }

  const applyTemplateToForm = (id) => {
    const template = templates.find((item) => item.id === id)
    if (!template) return
    applyNormalizedPayload(sanitizeSendPayload(template))
  }

  const changeSendMode = (nextMode) => {
    if (nextMode === 'event') {
      applyNormalizedPayload({ sendMode: nextMode, event: eventMessage || null })
      return
    }
    if (nextMode === 'list') {
      applyNormalizedPayload({
        sendMode: nextMode,
        text,
        footer,
        list: listMessage,
      })
      return
    }
    if (nextMode === 'buttons') {
      applyNormalizedPayload({
        sendMode: nextMode,
        text,
        footer,
        buttons,
      })
      return
    }
    if (nextMode === 'ad') {
      applyNormalizedPayload({
        sendMode: nextMode,
        text,
        externalAdReply,
      })
      return
    }
    if (nextMode === 'template') {
      applyNormalizedPayload({
        sendMode: nextMode,
        template: templateMessage,
      })
      return
    }
    if (nextMode === 'carousel') {
      applyNormalizedPayload({
        sendMode: nextMode,
        text,
        footer,
        carousel: carouselMessage,
      })
      return
    }

    applyNormalizedPayload({ sendMode: nextMode, text })
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const { recipients: parsedRecipients, columns: parsedColumns } = await parseRecipientsFile(file)
      if (!parsedRecipients.length) return setError('No valid phone numbers found in that file.')
      setRecipients(parsedRecipients)
      setColumns(parsedColumns)
      setFileName(file.name)
    } catch {
      setError('Could not read that file. Use .xlsx, .xls or .csv.')
    }
  }

  const buildList = () => {
    const manualList = manual
      .split(/[\n,]/)
      .map((number) => number.replace(/\D/g, ''))
      .filter((number) => number.length >= 6)
      .map((phone) => ({ phone, vars: {} }))

    return [...recipients, ...manualList]
  }

  const renderAdReplyForBulk = (adReply, vars) => {
    if (!adReply) return null
    return {
      ...adReply,
      title: applyTemplate(adReply.title || '', vars),
      body: applyTemplate(adReply.body || '', vars),
      url: applyTemplate(adReply.url || '', vars),
      thumbnailUrl: applyTemplate(adReply.thumbnailUrl || '', vars),
    }
  }

  const renderDeepForBulk = (value, vars) => {
    if (typeof value === 'string') return applyTemplate(value, vars)
    if (Array.isArray(value)) return value.map((item) => renderDeepForBulk(item, vars))
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, renderDeepForBulk(nested, vars)]),
      )
    }
    return value
  }

  const start = async () => {
    setError('')
    const recipientList = buildList()
    if (!sessionId) return setError('Select a connected WhatsApp number.')
    if (!recipientList.length) return setError('Upload a file or paste at least one number.')

    const payload = sanitizeSendPayload({
      sendMode,
      text,
      footer,
      buttons,
      list: listMessage,
      event: eventMessage,
      externalAdReply,
      template: templateMessage,
      carousel: carouselMessage,
    })

    if (
      !payload.text.trim() &&
      !payload.buttons.length &&
      !payload.list &&
      !payload.event &&
      !payload.externalAdReply &&
      !payload.template &&
      !payload.carousel
    ) {
      return setError('Add one supported message payload before sending.')
    }
    if (payload.externalAdReply && !payload.text.trim()) {
      return setError('External ad reply message text is required.')
    }

    cancelRef.current = false
    setPhase('sending')
    setProgress({ done: 0, sent: 0, failed: [] })
    const delayMs = Math.max(0, Number(delaySec) || 0) * 1000

    for (let index = 0; index < recipientList.length; index += 1) {
      if (cancelRef.current) break
      const { phone, vars } = recipientList[index]
      try {
        await waService.send(sessionId, phone, {
          ...payload,
          text: payload.text ? applyTemplate(payload.text, vars) : '',
          externalAdReply: renderAdReplyForBulk(payload.externalAdReply, vars),
          template: renderDeepForBulk(payload.template, vars),
          carousel: renderDeepForBulk(payload.carousel, vars),
        })
        setProgress((current) => ({ ...current, done: current.done + 1, sent: current.sent + 1 }))
      } catch (sendError) {
        setProgress((current) => ({
          ...current,
          done: current.done + 1,
          failed: [...current.failed, { phone, error: sendError.message }],
        }))
      }
      if (index < recipientList.length - 1 && delayMs) await sleep(delayMs)
    }
    setPhase('done')
  }

  const resetSend = () => {
    setPhase('config')
    setProgress({ done: 0, sent: 0, failed: [] })
    cancelRef.current = false
  }

  const total = buildList().length

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner className="h-8 w-8 text-brand-600" />
      </div>
    )
  }

  if (connected.length === 0) {
    return (
      <Card>
        <Card.Body className="flex flex-col items-center gap-3 py-14 text-center">
          <p className="font-semibold text-ink">No connected WhatsApp number</p>
          <p className="text-sm text-muted">Connect a number in Settings to send patient messages.</p>
          <Button onClick={() => navigate('/dashboard/whatsapp?tab=settings')}>Go to Settings</Button>
        </Card.Body>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <Card.Header>
          <span className="font-semibold text-ink">Broadcast reminders and updates</span>
        </Card.Header>
        <Card.Body className="space-y-5">
          {error && <Alert tone="error">{error}</Alert>}

          {phase === 'config' ? (
            <>
              <div>
                <Label>From</Label>
                <select
                  className="input-base"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                >
                  {connected.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.label} {session.phone ? `(+${session.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {templates.length > 0 && (
                <div>
                  <Label>Load a template (optional)</Label>
                  <select
                    className="input-base"
                    defaultValue=""
                    onChange={(e) => applyTemplateToForm(e.target.value)}
                  >
                    <option value="" disabled>
                      Choose a template...
                    </option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
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
                    <Label>Message</Label>
                    <textarea
                      className="input-base min-h-28"
                      placeholder="Hi {{name}}, this is a reminder about your upcoming visit."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                    <p className="mt-1.5 text-xs text-muted">
                      Personalize with{' '}
                      {columns.length > 0 ? (
                        columns.map((column) => (
                          <code
                            key={column}
                            className="mr-1 rounded bg-slate-100 px-1 py-0.5 text-[11px]"
                          >
                            {`{{${column}}}`}
                          </code>
                        ))
                      ) : (
                        <code className="rounded bg-slate-100 px-1">{'{{column}}'}</code>
                      )}
                    </p>
                    <p className="mt-1.5 text-xs text-muted">
                      {sendMode === 'text'
                        ? 'Plain text message.'
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
                        value={footer}
                        onChange={(e) => setFooter(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              {sendMode === 'buttons' && <ButtonBuilder value={buttons} onChange={setButtons} />}
              {sendMode === 'list' && <ListBuilder value={listMessage} onChange={setListMessage} />}
              {sendMode === 'event' && <EventBuilder value={eventMessage} onChange={setEventMessage} />}
              {sendMode === 'ad' && (
                <ExternalAdReplyBuilder value={externalAdReply} onChange={setExternalAdReply} />
              )}
              {sendMode === 'template' && (
                <HydratedTemplateBuilder value={templateMessage} onChange={setTemplateMessage} />
              )}
              {sendMode === 'carousel' && (
                <CarouselBuilder value={carouselMessage} onChange={setCarouselMessage} />
              )}

              <div>
                <Label>...or paste numbers (optional)</Label>
                <textarea
                  className="input-base min-h-20"
                  placeholder="One per line, e.g. 919876543210"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                />
              </div>

              <div>
                <Label>Delay between messages (seconds)</Label>
                <input
                  type="number"
                  min="0"
                  className="input-base w-32"
                  value={delaySec}
                  onChange={(e) => setDelaySec(e.target.value)}
                />
                <p className="mt-1.5 text-xs text-muted">
                  Use a short delay to keep reminders paced and safer.
                </p>
              </div>

              <Button fullWidth size="lg" leftIcon={<Send className="h-4 w-4" />} onClick={start}>
                Send to {total} patient{total === 1 ? '' : 's'}
              </Button>
            </>
          ) : (
            <SendingView
              phase={phase}
              progress={progress}
              total={total}
              onStop={() => {
                cancelRef.current = true
              }}
              onReset={resetSend}
            />
          )}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header className="flex items-center justify-between">
          <span className="font-semibold text-ink">Recipients</span>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={downloadSampleFile}
          >
            Sample Excel
          </Button>
        </Card.Header>
        <Card.Body className="space-y-4">
          {fileName ? (
            <div className="flex items-center justify-between rounded-xl border border-line bg-brand-50/50 px-3.5 py-2.5">
              <span className="flex items-center gap-2 text-sm text-ink">
                <FileSpreadsheet className="h-4 w-4 text-brand-600" />
                {fileName}
                <Badge tone="success">{recipients.length} numbers</Badge>
              </span>
              <button
                onClick={() => {
                  setRecipients([])
                  setColumns([])
                  setFileName('')
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-line bg-canvas px-4 py-8 text-center transition hover:border-brand-400 hover:bg-brand-50/40">
              <Upload className="h-6 w-6 text-brand-600" />
              <span className="text-sm font-medium text-ink">Upload .xlsx, .xls or .csv</span>
              <span className="text-xs text-muted">First sheet - phone column auto-detected</span>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
            </label>
          )}

          {recipients.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium text-muted">
                Preview - verify patient recipients before sending
              </p>
              <div className="max-h-80 overflow-auto rounded-xl border border-line">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">#</th>
                      <th className="px-3 py-2 font-semibold">Phone</th>
                      {columns
                        .filter((column) => column.toLowerCase() !== 'phone')
                        .map((column) => (
                          <th key={column} className="px-3 py-2 font-semibold">
                            {column}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {recipients.map((recipient, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-muted">{index + 1}</td>
                        <td className="px-3 py-2 font-medium text-ink">+{recipient.phone}</td>
                        {columns
                          .filter((column) => column.toLowerCase() !== 'phone')
                          .map((column) => (
                            <td key={column} className="px-3 py-2 text-muted">
                              {String(recipient.vars[column] ?? '')}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
              Upload a file to preview recipients here. Download the sample to see the
              expected format.
            </p>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

function SendingView({ phase, progress, total, onStop, onReset }) {
  const pct = total ? Math.round((progress.done / total) * 100) : 0
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-ink">{phase === 'done' ? 'Finished' : 'Sending...'}</span>
          <span className="text-muted">
            {progress.done} / {total}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex gap-3 text-sm">
        <Badge tone="success">{progress.sent} sent</Badge>
        {progress.failed.length > 0 && <Badge tone="danger">{progress.failed.length} failed</Badge>}
      </div>
      {progress.failed.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-xl border border-line bg-slate-50 p-3 text-xs text-muted">
          {progress.failed.map((failed) => (
            <div key={failed.phone}>
              +{failed.phone} - {failed.error}
            </div>
          ))}
        </div>
      )}
      {phase === 'sending' ? (
        <Button variant="secondary" fullWidth onClick={onStop}>
          Stop sending
        </Button>
      ) : (
        <Button fullWidth onClick={onReset}>
          Compose another batch
        </Button>
      )}
    </div>
  )
}
