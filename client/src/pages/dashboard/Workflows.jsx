import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Workflow as WorkflowIcon, LayoutTemplate } from 'lucide-react'
import { Button, Badge, Table, Card, Spinner } from '../../components/atoms'
import WorkflowTemplateGallery from '../../components/organisms/WorkflowTemplateGallery'
import flowService from '../../services/flowService'

const fmtDate = (ts) =>
  ts
    ? new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '-'

export default function Workflows() {
  const navigate = useNavigate()
  const [flows, setFlows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    flowService.list()
      .then(setFlows)
      .catch((requestError) => setError(requestError.message || 'Could not load workflows.'))
      .finally(() => setLoading(false))
  }, [])

  const create = async () => {
    setBusy('create')
    setError('')
    try {
      const flow = await flowService.create('Untitled workflow')
      navigate(`/dashboard/workflows/${flow.id}`)
    } catch (requestError) {
      setError(requestError.message || 'Could not create the workflow.')
    } finally {
      setBusy(null)
    }
  }

  const createFromTemplate = async (template) => {
    setError('')
    try {
      const flow = await flowService.createFromTemplate(template)
      navigate(`/dashboard/workflows/${flow.id}`)
    } catch (requestError) {
      setError(requestError.message || 'Could not create a workflow from that template.')
    }
  }

  const togglePublish = async (flow) => {
    setBusy(flow.id)
    try {
      const updated = await flowService.publish(flow.id, flow.status !== 'published')
      setFlows((prev) => prev.map((item) => (item.id === flow.id ? updated : item)))
    } catch (requestError) {
      setError(requestError.message || 'Could not change the workflow status.')
    } finally {
      setBusy(null)
    }
  }

  const remove = async (id) => {
    setError('')
    try {
      await flowService.remove(id)
      setFlows((prev) => prev.filter((flow) => flow.id !== id))
    } catch (requestError) {
      setError(requestError.message || 'Could not delete the workflow.')
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink">Care workflows</h2>
          <p className="mt-1 text-sm text-muted">Build reusable journeys for patient communication and follow-up.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={<LayoutTemplate className="h-4 w-4" />} onClick={() => setShowTemplates(true)}>
            Clinic templates
          </Button>
          <Button leftIcon={<Plus className="h-4 w-4" />} loading={busy === 'create'} onClick={create}>New workflow</Button>
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <div className="grid place-items-center py-20">
          <Spinner className="h-8 w-8 text-brand-600" />
        </div>
      ) : flows.length === 0 ? (
        <Card>
          <Card.Body className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <WorkflowIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="font-semibold text-ink">No workflows yet</p>
              <p className="text-sm text-muted">
                Start from a clinic template or build a patient journey from scratch.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                leftIcon={<LayoutTemplate className="h-4 w-4" />}
                onClick={() => setShowTemplates(true)}
              >
                Browse templates
              </Button>
              <Button leftIcon={<Plus className="h-4 w-4" />} onClick={create}>
                Build from scratch
              </Button>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Th>Name</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Nodes</Table.Th>
              <Table.Th>Updated</Table.Th>
              <Table.Th className="text-right">Actions</Table.Th>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {flows.map((flow) => (
              <Table.Row key={flow.id}>
                <Table.Td>
                  <button
                    className="font-semibold text-ink hover:text-brand-700"
                    onClick={() => navigate(`/dashboard/workflows/${flow.id}`)}
                  >
                    {flow.name}
                  </button>
                </Table.Td>
                <Table.Td>
                  <Badge tone={flow.status === 'published' ? 'success' : 'neutral'}>
                    {flow.status === 'published' ? 'Live' : 'Draft'}
                  </Badge>
                </Table.Td>
                <Table.Td>{flow.nodes?.length || 0}</Table.Td>
                <Table.Td className="text-muted">{fmtDate(flow.updatedAt)}</Table.Td>
                <Table.Td>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant={flow.status === 'published' ? 'secondary' : 'primary'}
                      loading={busy === flow.id}
                      onClick={() => togglePublish(flow)}
                    >
                      {flow.status === 'published' ? 'Unpublish' : 'Publish'}
                    </Button>
                    <button
                      title="Edit"
                      onClick={() => navigate(`/dashboard/workflows/${flow.id}`)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      title="Delete"
                      onClick={() => remove(flow.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Table.Td>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      <WorkflowTemplateGallery
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onUseTemplate={createFromTemplate}
      />
    </>
  )
}
