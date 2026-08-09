import { useProfile } from '../../context/ProfileContext'
import { Bell } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import WindowControls from './WindowControls'

const isTauriDesktop = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/**
 * Header — the consistent top bar used across the app shell.
 * `title`/`subtitle` describe the current section; `actions` is a slot for
 * the page's primary action(s).
 */
export default function Header({ actions }) {
  const { user } = useProfile()
  const desktop = isTauriDesktop()

  const startDragging = (event) => {
    if (!desktop || event.button !== 0) return
    event.preventDefault()
    // The HTML drag-region attribute remains as a native fallback. This
    // explicit call is reliable with the custom frameless Windows title bar.
    void getCurrentWindow().startDragging().catch(() => {})
  }

  const toggleMaximize = () => {
    if (!desktop) return
    window.dispatchEvent(new CustomEvent('growcare:window-action', { detail: { action: 'toggle-maximize' } }))
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center border-b border-line bg-canvas pl-6">
      <div
        data-tauri-drag-region
        className="min-w-0 flex-1 self-stretch"
        onMouseDown={startDragging}
        onDoubleClick={toggleMaximize}
        aria-label="Drag window"
      />
      <div className="flex h-full items-center gap-3">
        {actions}
        <button type="button" aria-label="Notifications" title="Notifications" className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-canvas hover:text-ink">
          <Bell className="h-4 w-4" strokeWidth={1.8} />
        </button>
        <div className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </span>
          <span className="hidden text-sm font-medium text-ink sm:block">
            {user?.name?.split(' ')[0] || 'User'}
          </span>
        </div>
        <WindowControls />
      </div>
    </header>
  )
}
