import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquareText,
  Users,
  ChevronLeft,
  LogOut,
} from 'lucide-react'
import { Logo } from '../atoms'
import { cn } from '../../lib/cn'
import { useAuth } from '../../context/AuthContext'

const nav = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/dashboard/patients', label: 'Patients', Icon: Users },
  { to: '/dashboard/whatsapp', label: 'WhatsApp', Icon: MessageSquareText },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth()

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col bg-night-900 text-slate-300 transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        {collapsed ? (
          <Logo showText={false} className="mx-auto" />
        ) : (
          <Logo invert />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-brand-500 text-night-900'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + collapse */}
      <div className="border-t border-white/10 p-3">
        <div
          className={cn(
            'mb-2 flex items-center gap-2.5 rounded-xl px-2 py-2',
            collapsed && 'justify-center px-0',
          )}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-bold text-night-900">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {user?.name || 'User'}
              </p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              title="Log out"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          onClick={onToggle}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <ChevronLeft
            className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
