import { useEffect, useRef } from 'react'
import { getLocalServerConfig } from '../lib/localServer'

/** Subscribe to local QR, status, and incoming-message events from the sidecar. */
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
      try {
        const server = await getLocalServerConfig()
        if (closed) return
        ws = new WebSocket(`${server.wsUrl}/ws`)
        ws.onmessage = (event) => {
          try {
            handlerRef.current?.(JSON.parse(event.data))
          } catch {
            // Ignore malformed sidecar events.
          }
        }
        ws.onclose = () => {
          if (!closed) retry = setTimeout(connect, 3000)
        }
      } catch {
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
