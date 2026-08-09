import { useEffect, useState } from 'react'
import { Maximize2, Minimize2, Shrink, X } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'

const isTauriDesktop = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** Native window actions, exposed as in-app controls for the frameless shell. */
export default function WindowControls() {
  const desktop = isTauriDesktop()
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    if (!desktop) return undefined
    const appWindow = getCurrentWindow()
    let disposed = false
    let unlisten
    const syncMaximized = async () => {
      try {
        const value = await appWindow.isMaximized()
        if (!disposed) setMaximized(value)
      } catch {
        // Window APIs are unavailable only outside a Tauri desktop runtime.
      }
    }

    void syncMaximized()
    void appWindow.onResized(syncMaximized).then((stop) => { unlisten = stop })
    return () => {
      disposed = true
      unlisten?.()
    }
  }, [desktop])

  if (!desktop) return null

  const safely = (action) => { void action().catch(() => {}) }
  const appWindow = getCurrentWindow()

  return (
    <div className="flex h-full items-stretch border-l border-line" aria-label="Window controls">
      <button type="button" aria-label="Minimize window" title="Minimize" onClick={() => safely(() => appWindow.minimize())} className="grid w-11 place-items-center text-muted transition hover:bg-canvas hover:text-ink">
        <Minimize2 className="h-4 w-4" />
      </button>
      <button type="button" aria-label={maximized ? 'Restore window' : 'Maximize window'} title={maximized ? 'Restore' : 'Maximize'} onClick={() => safely(() => appWindow.toggleMaximize())} className="grid w-11 place-items-center text-muted transition hover:bg-canvas hover:text-ink">
        {maximized ? <Shrink className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      </button>
      <button type="button" aria-label="Close application" title="Close" onClick={() => safely(() => appWindow.close())} className="grid w-11 place-items-center text-muted transition hover:bg-red-500 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
