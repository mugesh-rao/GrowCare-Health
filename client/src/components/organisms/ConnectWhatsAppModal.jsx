import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle2, Smartphone } from 'lucide-react'
import { Modal, Button, Spinner } from '../atoms'
import useRealtime from '../../hooks/useRealtime'
import waService from '../../services/waService'

/**
 * ConnectWhatsAppModal — creates a session, shows the live QR (streamed over
 * WebSocket), and flips to "connected" when pairing succeeds. If the user
 * closes before pairing, the unpaired session is deleted so stray "Scan QR"
 * entries don't accumulate (no repeated reconnect prompts).
 */
export default function ConnectWhatsAppModal({ open, onClose, onConnected }) {
  const [sessionId, setSessionId] = useState(null)
  const [qr, setQr] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  // Refs so the close handler sees the latest values without mutating them during render.
  const sessionRef = useRef(null)
  const statusRef = useRef('idle')
  useEffect(() => { sessionRef.current = sessionId }, [sessionId])
  useEffect(() => { statusRef.current = status }, [status])

  // Listen for qr/status events for this session.
  useRealtime((evt) => {
    if (!sessionId || evt.sessionId !== sessionId) return
    if (evt.type === 'qr') {
      setQr(evt.qr)
      setStatus('qr')
    } else if (evt.type === 'status') {
      setStatus(evt.status)
      if (evt.status === 'connected') {
        setQr(null)
        onConnected?.()
      }
    }
  })

  // Close: clean up an abandoned (not-yet-connected) session.
  const handleClose = () => {
    const sid = sessionRef.current
    if (sid && statusRef.current !== 'connected') {
      waService.remove(sid).catch(() => {})
    }
    onClose?.()
  }

  useEffect(() => {
    if (!open) {
      const reset = setTimeout(() => {
        setSessionId(null)
        setQr(null)
        setStatus('idle')
        setError('')
      }, 0)
      return () => clearTimeout(reset)
    }
    let cancelled = false
    const connecting = setTimeout(() => setStatus('connecting'), 0)
    waService
      .create('WhatsApp')
      .then((s) => {
        if (cancelled) return
        setSessionId(s.sessionId)
        // Poll while pairing: QR delivery must not depend on a single WebSocket event.
        const poll = async () => {
          try {
            const d = await waService.get(s.sessionId)
            if (cancelled) return
            if (d.qr) setQr(d.qr)
            setStatus(d.status)
            if (d.status !== 'connected' && d.status !== 'logged_out') timer = setTimeout(poll, 1000)
          } catch {
            if (!cancelled) timer = setTimeout(poll, 1500)
          }
        }
        let timer = setTimeout(poll, 500)
        cleanupPoll = () => clearTimeout(timer)
      })
      .catch((e) => !cancelled && setError(e.message))
    let cleanupPoll = () => {}
    return () => {
      cancelled = true
      clearTimeout(connecting)
      cleanupPoll()
    }
  }, [open])

  return (
    <Modal open={open} onClose={handleClose} title="Connect WhatsApp">
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : status === 'connected' ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-brand-500" />
          <p className="font-semibold text-ink">WhatsApp connected!</p>
          <p className="text-sm text-muted">
            You're all set — you won't need to scan again unless you log out.
          </p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="grid h-64 w-64 place-items-center rounded-xl border border-line bg-white">
            {qr ? (
              <QRCodeSVG value={qr} size={224} level="M" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted">
                <Spinner className="h-6 w-6 text-brand-600" />
                <span className="text-sm">Generating QR…</span>
              </div>
            )}
          </div>
          <ol className="space-y-1.5 text-left text-sm text-muted">
            <li className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> Open WhatsApp on your phone
            </li>
            <li>2. Tap <b>Settings → Linked Devices</b></li>
            <li>3. Tap <b>Link a Device</b> and scan this code</li>
          </ol>
        </div>
      )}
    </Modal>
  )
}
