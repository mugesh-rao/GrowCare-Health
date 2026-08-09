import { useProfile } from '../../context/ProfileContext'
import WindowControls from './WindowControls'

/**
 * Header — the consistent top bar used across the app shell.
 * `title`/`subtitle` describe the current section; `actions` is a slot for
 * the page's primary action(s).
 */
export default function Header({ title, subtitle, actions }) {
  const { user } = useProfile()
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center border-b border-line bg-white/90 pl-6 backdrop-blur">
      <div data-tauri-drag-region className="min-w-0 flex-1">
        <h1 className="truncate font-display text-lg font-bold leading-tight text-ink">
          {title}
        </h1>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      <div className="flex h-full items-center gap-3">
        {actions}
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
