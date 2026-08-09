import { useEffect, useState } from 'react'
import { Minus, Square, X } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'

const isTauriDesktop = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** Native window actions, exposed as in-app controls for the frameless shell. */
export default function WindowControls() {
  const desktop = isTauriDesktop()
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    if (!desktop) return undefined
    const runWindowAction = async (event) => {
      try {
        const state = await invoke('window_action', { action: event.detail?.action })
        setMaximized(Boolean(state.maximized))
      } catch {
        // A native window may already be closing.
      }
    }
    window.addEventListener('growcare:window-action', runWindowAction)
    return () => window.removeEventListener('growcare:window-action', runWindowAction)
  }, [desktop])

  if (!desktop) return null

  const dispatch = (action) => window.dispatchEvent(new CustomEvent('growcare:window-action', { detail: { action } }))

  return (
    <div className="flex h-full items-stretch border-l border-line" aria-label="Window controls">
      <button type="button" aria-label="Minimize window" title="Minimize" onClick={() => dispatch('minimize')} className="grid w-11 place-items-center text-muted transition hover:bg-canvas hover:text-ink">
        <Minus className="h-4 w-4" strokeWidth={2} />
      </button>
      <button type="button" aria-label={maximized ? 'Restore window' : 'Maximize window'} title={maximized ? 'Restore' : 'Maximize'} onClick={() => dispatch('toggle-maximize')} className="grid w-11 place-items-center text-muted transition hover:bg-canvas hover:text-ink">
        <Square className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <button type="button" aria-label="Close application" title="Close" onClick={() => dispatch('close')} className="grid w-11 place-items-center text-muted transition hover:bg-red-500 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
