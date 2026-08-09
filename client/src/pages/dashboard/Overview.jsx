import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Inbox,
  Send,
  Users,
  Smartphone,
  Plus,
  ArrowRight,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { Card, Spinner, Button, Badge } from '../../components/atoms'
import useRealtime from '../../hooks/useRealtime'
import useHeaderActions from '../../hooks/useHeaderActions'
import userService from '../../services/userService'
import waService from '../../services/waService'

const statCards = [
  { key: 'received', label: 'Patient messages', Icon: Inbox, tint: 'bg-brand-50 text-brand-700' },
  { key: 'sent', label: 'Replies sent', Icon: Send, tint: 'bg-night-900 text-brand-400' },
  { key: 'contacts', label: 'Patient contacts', Icon: Users, tint: 'bg-emerald-50 text-emerald-700' },
  { key: 'connectedNumbers', label: 'Connected numbers', Icon: Smartphone, tint: 'bg-brand-50 text-brand-700' },
]

const statusTone = {
  connected: 'success',
  qr: 'warning',
  connecting: 'warning',
  reconnecting: 'warning',
  logged_out: 'danger',
  disconnected: 'neutral',
}

function ActivityChart({ activity = [] }) {
  const series = activity.length === 7
    ? activity
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => ({ label, received: 0, sent: 0 }))
  const values = series.map((day) => (day.received || 0) + (day.sent || 0))
  const maximum = Math.max(...values, 1)
  const points = values.map((value, index) => {
    const x = 8 + index * 16
    const y = 78 - (value / maximum) * 56
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between text-xs text-muted">
        <span>Messages this week</span>
        <span>{values.reduce((total, value) => total + value, 0).toLocaleString()} total</span>
      </div>
      <svg viewBox="0 0 112 92" className="h-48 w-full" role="img" aria-label="Weekly message activity chart">
        {[22, 50, 78].map((y) => <line key={y} x1="8" x2="104" y1={y} y2={y} stroke="#e7e5df" strokeWidth="0.7" />)}
        <defs>
          <linearGradient id="activity-area" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#14736f" stopOpacity="0.24" />
            <stop offset="1" stopColor="#14736f" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M 8,78 L ${points.replaceAll(' ', ' L ')} L 104,78 Z`} fill="url(#activity-area)" />
        <polyline points={points} fill="none" stroke="#14736f" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
        {values.map((value, index) => {
          const x = 8 + index * 16
          const y = 78 - (value / maximum) * 56
          return <circle key={series[index]?.date || series[index]?.label || index} cx={x} cy={y} r="2.3" fill="#fdfcf9" stroke="#14736f" strokeWidth="1.6" />
        })}
        {series.map((day, index) => <text key={day.date || day.label} x={8 + index * 16} y="89" textAnchor="middle" fill="#78807d" fontSize="5.5">{day.label || new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3)}</text>)}
      </svg>
    </div>
  )
}

export default function Overview() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState([])

  useHeaderActions(
    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/dashboard/patients/new')}>
      Create patient
    </Button>,
  )

  useEffect(() => {
    userService.stats().then(setStats).catch(() => setStats({}))
    waService.list().then(setSessions).catch(() => {})
  }, [])

  useRealtime((evt) => {
    if (evt.type === 'message') {
      setStats((current) =>
        current
          ? {
              ...current,
              received: current.received + (evt.message.direction === 'in' ? 1 : 0),
              sent: current.sent + (evt.message.direction === 'out' ? 1 : 0),
            }
          : current,
      )
    }
    if (evt.type === 'status') {
      setSessions((prev) => prev.map((item) => (item.id === evt.sessionId ? { ...item, status: evt.status } : item)))
    }
  })

  const connectedCount = sessions.filter((session) => session.status === 'connected').length
  const checklist = [
    {
      done: connectedCount > 0,
      label: 'Connect your clinic WhatsApp number',
      to: '/dashboard/settings',
    },
  ]

  if (!stats) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner className="h-8 w-8 text-brand-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ key, label, Icon, tint }) => (
          <Card key={key}>
            <Card.Body>
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${tint}`}>
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-sm text-muted">{label}</p>
              <p className="mt-0.5 text-3xl font-extrabold text-ink">
                {(stats[key] ?? 0).toLocaleString()}
              </p>
            </Card.Body>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Card.Header className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink">Patient communication activity</p>
              <p className="mt-0.5 text-sm text-muted">A quick view of this week&apos;s clinic messages.</p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Last 7 days</span>
          </Card.Header>
          <Card.Body className="pt-0">
            <ActivityChart activity={stats.activity || []} />
            <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted">Incoming</p><p className="mt-1 text-2xl font-bold text-ink">{(stats.received ?? 0).toLocaleString()}</p></div>
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted">Replies sent</p><p className="mt-1 text-2xl font-bold text-ink">{(stats.sent ?? 0).toLocaleString()}</p></div>
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <span className="font-semibold text-ink">Getting started</span>
          </Card.Header>
          <Card.Body className="space-y-3">
            {checklist.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.to)}
                className="flex w-full items-center gap-2.5 text-left text-sm"
              >
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-slate-300" />
                )}
                <span className={item.done ? 'text-muted line-through' : 'text-ink'}>
                  {item.label}
                </span>
              </button>
            ))}
          </Card.Body>
        </Card>

        <Card className="lg:col-span-2">
          <Card.Header className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold text-ink">
              <Smartphone className="h-4.5 w-4.5 text-brand-600" /> WhatsApp connections
            </span>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => navigate('/dashboard/settings')}
            >
              Manage
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            {sessions.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted">
                No numbers connected yet.{' '}
                <button
                  className="font-semibold text-brand-600"
                  onClick={() => navigate('/dashboard/settings')}
                >
                  Connect WhatsApp
                </button>
              </p>
            ) : (
              <div className="divide-y divide-line">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{session.label}</p>
                      <p className="text-xs text-muted">
                        {session.phone ? `+${session.phone}` : 'Not paired'}
                      </p>
                    </div>
                    <Badge tone={statusTone[session.status] || 'neutral'}>
                      {session.status === 'connected' ? 'Connected' : session.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>

      </div>
    </div>
  )
}
