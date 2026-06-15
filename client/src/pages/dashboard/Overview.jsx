import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Inbox,
  Send,
  Users,
  Smartphone,
  Workflow,
  Plus,
  ArrowRight,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { Card, Spinner, Button, Badge } from '../../components/atoms'
import useRealtime from '../../hooks/useRealtime'
import useHeaderActions from '../../hooks/useHeaderActions'
import { useAuth } from '../../context/AuthContext'
import userService from '../../services/userService'
import waService from '../../services/waService'
import flowService from '../../services/flowService'

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

export default function Overview() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState([])
  const [flows, setFlows] = useState([])

  useHeaderActions(
    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/dashboard?tab=workflows')}>
      New workflow
    </Button>,
  )

  useEffect(() => {
    userService.stats().then(setStats).catch(() => setStats({}))
    waService.list().then(setSessions).catch(() => {})
    flowService.list().then(setFlows).catch(() => {})
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
  const publishedCount = flows.filter((flow) => flow.status === 'published').length

  const checklist = [
    {
      done: connectedCount > 0,
      label: 'Connect your clinic WhatsApp number',
      to: '/dashboard/whatsapp?tab=settings',
    },
    {
      done: flows.length > 0,
      label: 'Create your first care workflow',
      to: '/dashboard?tab=workflows',
    },
    {
      done: publishedCount > 0,
      label: 'Publish a workflow to go live',
      to: '/dashboard?tab=workflows',
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
      <div>
        <h2 className="font-display text-xl font-extrabold text-ink">
          Welcome back, {user?.name?.split(' ')[0] || 'there'}
        </h2>
        <p className="text-sm text-muted">
          Here&apos;s the current snapshot of your clinic communication desk.
        </p>
      </div>

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
            <span className="flex items-center gap-2 font-semibold text-ink">
              <Smartphone className="h-4.5 w-4.5 text-brand-600" /> WhatsApp connections
            </span>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => navigate('/dashboard/whatsapp?tab=settings')}
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
                  onClick={() => navigate('/dashboard/whatsapp?tab=settings')}
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
      </div>

      <Card>
        <Card.Header className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold text-ink">
            <Workflow className="h-4.5 w-4.5 text-brand-600" /> Workflows
          </span>
          <div className="flex items-center gap-2">
            <Badge tone="brand">{publishedCount} live</Badge>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => navigate('/dashboard?tab=workflows')}
            >
              Open
            </Button>
          </div>
        </Card.Header>
        <Card.Body className="text-sm text-muted">
          {flows.length} total workflow{flows.length === 1 ? '' : 's'} and {publishedCount} live
          care automation{publishedCount === 1 ? '' : 's'}.
        </Card.Body>
      </Card>
    </div>
  )
}
