import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  ArrowLeft,
  GitBranch,
  Sparkles,
  Send,
  Clock,
  Globe,
  UserCheck,
  Package,
  Tag,
  BellRing,
  CalendarClock,
  CreditCard,
  Check,
  Save,
} from 'lucide-react'
import { Button, Badge, Spinner, Logo } from '../components/atoms'
import { nodeTypes } from '../components/workflow/nodeTypes'
import NodeConfigPanel from '../components/workflow/NodeConfigPanel'
import flowService from '../services/flowService'
import waService from '../services/waService'

let idSeq = 1
const newId = (type) => `${type}-${Date.now()}-${idSeq++}`
const edgeId = (conn) =>
  `edge-${conn.source}-${conn.sourceHandle || 'default'}-${conn.target}-${conn.targetHandle || 'default'}`

function normalizeEdges(edges = []) {
  return (Array.isArray(edges) ? edges : [])
    .filter((edge) => edge?.source && edge?.target)
    .map((edge, index) => ({
      ...edge,
      id: edge.id || `${edgeId(edge)}-${index}`,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
      animated: edge.animated !== false,
    }))
}

const paletteGroups = [
  {
    group: 'Logic & Flow',
    items: [
      { type: 'condition', label: 'Condition', Icon: GitBranch, hint: 'Branch on keywords / fields' },
      { type: 'delay', label: 'Delay', Icon: Clock, hint: 'Wait before the next step' },
      { type: 'router', label: 'AI Router', Icon: Sparkles, hint: 'Let AI choose the next branch' },
    ],
  },
  {
    group: 'Messaging',
    items: [
      { type: 'send', label: 'Send Message', Icon: Send, hint: 'Text, buttons, list, media' },
      { type: 'ai', label: 'AI Reply', Icon: Sparkles, hint: 'Generate a reply with AI' },
      { type: 'catalog', label: 'Send Catalog', Icon: Package, hint: 'Product carousel' },
    ],
  },
  {
    group: 'Revenue',
    items: [
      { type: 'payment', label: 'Payment Link', Icon: CreditCard, hint: 'Send a pay-now link' },
      { type: 'booking', label: 'Booking', Icon: CalendarClock, hint: 'Offer & confirm slots' },
      { type: 'schedule', label: 'Reminder / Follow-up', Icon: BellRing, hint: 'Send later (recovery, nudge)' },
    ],
  },
  {
    group: 'Data & Actions',
    items: [
      { type: 'set', label: 'Set Field', Icon: Tag, hint: 'Tag / store on contact' },
      { type: 'api', label: 'API Request', Icon: Globe, hint: 'Call any HTTP endpoint' },
      { type: 'handoff', label: 'Human Handoff', Icon: UserCheck, hint: 'Pause bot, alert team' },
    ],
  },
]

function defaultNodeData(type) {
  if (type === 'send') {
    return {
      sendMode: 'text',
      message: '',
      footer: '',
      title: '',
      buttons: [],
      list: null,
      event: null,
      externalAdReply: null,
      template: null,
      product: null,
      carousel: null,
    }
  }
  if (type === 'api') {
    return {
      method: 'POST',
      url: '',
      headers: [{ key: 'Content-Type', value: 'application/json' }],
      bodyTemplate:
        '{\n' +
        '  "name": "{{name}}",\n' +
        '  "phone": "{{phone}}",\n' +
        '  "message": "{{message}}"\n' +
        '}',
    }
  }
  if (type === 'router') {
    return {
      provider: 'openai',
      apiKey: '',
      baseURL: '',
      model: 'gpt-4o-mini',
      systemPrompt: '',
      confidenceThreshold: 0.55,
      fallbackRoute: 'fallback',
      saveAs: 'router',
      routes: [
        { id: 'route_1', label: 'Route 1', description: '' },
        { id: 'route_2', label: 'Route 2', description: '' },
        { id: 'route_3', label: 'Route 3', description: '' },
        { id: 'route_4', label: 'Route 4', description: '' },
        { id: 'fallback', label: 'Fallback', description: 'Use this path when no route matches or confidence is low.' },
      ],
    }
  }
  if (type === 'handoff') {
    return { reason: 'requested', note: 'Customer asked for a human.', assignee: '' }
  }
  if (type === 'catalog') return { productIds: [], message: 'Here are our products 👇' }
  if (type === 'set') return { field: '', value: '{{message}}' }
  if (type === 'schedule') return { seconds: 86400, message: '' }
  if (type === 'booking') {
    return { service: 'appointment', daysAhead: 5, startHour: 9, endHour: 18, intervalMins: 30, reminderHours: 24, message: '', confirmMessage: '' }
  }
  if (type === 'payment') {
    return { message: 'Complete your payment below 👇', label: 'Pay now', linkTemplate: '', amount: '', currency: '₹' }
  }
  return {}
}

export default function WorkflowPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [flow, setFlow] = useState(null)
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [sessions, setSessions] = useState([])
  const [boundSessionIds, setBoundSessionIds] = useState([])

  useEffect(() => {
    flowService
      .get(id)
      .then((f) => {
        setFlow(f)
        setNodes(f.nodes || [])
        setEdges(normalizeEdges(f.edges || []))
        setBoundSessionIds(f.boundSessionIds || [])
      })
      .finally(() => setLoading(false))
    waService.list().then(setSessions).catch(() => {})
  }, [id])

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  )
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  )
  const onConnect = useCallback(
    (conn) =>
      setEdges((eds) =>
        addEdge({ ...conn, id: edgeId(conn), animated: true }, normalizeEdges(eds)),
      ),
    [],
  )

  const addNode = (type) => {
    const node = {
      id: newId(type),
      type,
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 160 },
      data: defaultNodeData(type),
    }
    setNodes((nds) => [...nds, node])
    setSelectedId(node.id)
  }

  const selected = nodes.find((n) => n.id === selectedId)

  const updateSelectedData = (data) =>
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedId ? { ...n, data } : n)),
    )

  const deleteSelected = () => {
    setNodes((nds) => nds.filter((n) => n.id !== selectedId))
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedId && e.target !== selectedId),
    )
    setSelectedId(null)
  }

  const save = async () => {
    setSaving(true)
    try {
      await flowService.save(id, { name: flow.name, nodes, edges: normalizeEdges(edges) })
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async () => {
    await flowService.save(id, { name: flow.name, nodes, edges: normalizeEdges(edges) })
    const updated = await flowService.publish(id, flow.status !== 'published', boundSessionIds)
    setFlow(updated)
  }

  const toggleBoundSession = (sid) => {
    setBoundSessionIds((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid],
    )
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner className="h-8 w-8 text-brand-600" />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-canvas">
      {/* Consistent top header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-white px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/dashboard/workflows')}
          >
            Back
          </Button>
          <span className="hidden sm:block"><Logo /></span>
          <span className="h-6 w-px bg-line" />
          <input
            className="rounded-lg px-2 py-1 font-display text-lg font-bold text-ink outline-none hover:bg-canvas focus:bg-canvas"
            value={flow.name}
            onChange={(e) => setFlow({ ...flow, name: e.target.value })}
          />
          <Badge tone={flow.status === 'published' ? 'success' : 'neutral'}>
            {flow.status === 'published' ? 'Live' : 'Draft'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <RunOnSelector
            sessions={sessions}
            bound={boundSessionIds}
            onToggle={toggleBoundSession}
          />
          {savedAt && (
            <span className="text-xs text-muted">Saved</span>
          )}
          <Button
            variant="secondary"
            size="sm"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={save}
          >
            Save
          </Button>
          <Button
            size="sm"
            leftIcon={<Check className="h-4 w-4" />}
            onClick={togglePublish}
          >
            {flow.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Palette */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-white">
          <div className="border-b border-line px-4 py-3.5">
            <p className="font-display text-sm font-bold text-ink">Add node</p>
            <p className="text-xs text-muted">Click to drop onto the canvas</p>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
            {paletteGroups.map(({ group, items }) => (
              <div key={group}>
                <p className="eyebrow mb-2">{group}</p>
                <div className="space-y-1.5">
                  {items.map(({ type, label, Icon, hint }) => (
                    <button
                      key={type}
                      onClick={() => addNode(type)}
                      title={hint}
                      className="group flex w-full items-start gap-2.5 rounded-xl border border-line bg-white px-3 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50"
                    >
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 group-hover:bg-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{label}</span>
                        <span className="block truncate text-xs text-muted">{hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="border-t border-line px-4 py-3 text-xs text-muted">
            Tip: drag from a node&apos;s bottom dot to another node to connect steps.
          </p>
        </aside>

        {/* Canvas */}
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
          >
            <Background color="#cdd8d2" gap={20} />
            <Controls />
          </ReactFlow>
        </div>

        {/* Config */}
        <aside className="w-80 shrink-0 overflow-y-auto border-l border-line bg-white">
          <NodeConfigPanel
            node={selected}
            nodes={nodes}
            edges={edges}
            onChange={updateSelectedData}
            onDelete={deleteSelected}
          />
        </aside>
      </div>
    </div>
  )
}

/** Pick which connected number(s) this flow runs on. Empty = all numbers. */
function RunOnSelector({ sessions, bound, onToggle }) {
  const [open, setOpen] = useState(false)
  const connected = sessions.filter((s) => s.status === 'connected')
  const label =
    bound.length === 0
      ? 'All numbers'
      : `${bound.length} number${bound.length === 1 ? '' : 's'}`

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-canvas"
      >
        Run on: <span className="text-brand-700">{label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-line bg-white p-2">
            <p className="px-2 py-1 text-xs text-muted">
              Leave all unchecked to run on every number.
            </p>
            {connected.length === 0 ? (
              <p className="px-2 py-2 text-sm text-muted">No connected numbers.</p>
            ) : (
              connected.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={bound.includes(s.id)}
                    onChange={() => onToggle(s.id)}
                  />
                  <span className="text-ink">{s.label}</span>
                  <span className="text-xs text-muted">{s.phone ? `+${s.phone}` : ''}</span>
                </label>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
