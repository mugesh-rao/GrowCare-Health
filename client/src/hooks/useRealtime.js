/* eslint-disable no-useless-assignment */
import { useEffect, useRef } from 'react'
import { firebaseEnabled, getIdToken } from '../lib/firebase'
import { CONFIG } from '../lib/config'

/**
 * useRealtime — subscribe to the server's /ws hub for qr / status / message
 * events. Calls `onEvent(payload)` for each message. Auto-reconnects.
 */
export default function useRealtime(onEvent) {
  const handlerRef = useRef(onEvent)

  useEffect(() => {
    handlerRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    let ws
    let closed = false
    let retry

    async function connect() {
      const base = CONFIG.WS_URL

      let qs = ''
      if (firebaseEnabled) {
        const token = await getIdToken()
        qs = token ? `?token=${encodeURIComponent(token)}` : ''
      } else {
        qs = `?uid=${encodeURIComponent(
          localStorage.getItem('wa_dev_uid') || 'dev-user',
        )}`
      }

      ws = new WebSocket(`${base}/ws${qs}`)
      ws.onmessage = (e) => {
        try {
          handlerRef.current?.(JSON.parse(e.data))
        } catch {
          /* ignore */
        }
      }
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 3000)
      }
    }

    connect()
    return () => {
      closed = true
      clearTimeout(retry)
      ws?.close()
    }
  }, [])
}
