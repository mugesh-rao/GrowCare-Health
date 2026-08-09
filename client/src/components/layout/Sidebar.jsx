import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquareText,
  Users,
  ChevronLeft,
  CircleUserRound,
  Settings,
  CircleHelp,
  CalendarDays,
  WandSparkles,
} from 'lucide-react'
import { Logo } from '../atoms'
import { cn } from '../../lib/cn'
import { useProfile } from '../../context/ProfileContext'

const nav = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/dashboard/patients', label: 'Patients', Icon: Users },
  { to: '/dashboard/whatsapp', label: 'WhatsApp', Icon: MessageSquareText },
  { to: '/dashboard/workflows', label: 'Workflows', Icon: WandSparkles },
  { to: '/dashboard/bookings', label: 'Bookings', Icon: CalendarDays },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useProfile()

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r border-line bg-canvas text-ink transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      {/* Window-like utility strip: profile and sidebar toggle live together at the top. */}
      <div className={cn('flex h-14 items-center px-5 text-muted', collapsed ? 'justify-center' : 'justify-between')}>
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-[#eeeae3] hover:text-ink"
        >
          <ChevronLeft className={cn('h-[18px] w-[18px] transition-transform', collapsed && 'rotate-180')} strokeWidth={1.8} />
        </button>
        {!collapsed && <button type="button" title="Local profile" className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-[#eeeae3] hover:text-ink"><CircleUserRound className="h-[18px] w-[18px]" strokeWidth={1.8} /></button>}
      </div>

      {/* Brand */}
      <div className="flex h-[70px] items-center px-5">
        {collapsed ? (
          <Logo showText={false} className="mx-auto" />
        ) : (
          <Logo />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 pb-4">
        {nav.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold tracking-[-0.01em] transition',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-[#ebe8e1] text-ink'
                  : 'text-ink hover:bg-[#eeeae3]',
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Reference-style utility links and a local-workspace callout. */}
      {!collapsed && (
        <div className="space-y-1 border-t border-line px-3 py-4">
          <NavLink to="/dashboard/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-[#eeeae3]">
            <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} /> Settings
          </NavLink>
          <a href="mailto:support@growcare.local" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-[#eeeae3]">
            <CircleHelp className="h-[18px] w-[18px]" strokeWidth={1.8} /> Help
          </a>
        </div>
      )}

      {/* Local profile */}
      <div className="border-t border-line p-3">
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-xl bg-[#f0eee8] px-2.5 py-2.5',
            collapsed && 'justify-center px-0',
          )}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {user?.name || 'User'}
              </p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
