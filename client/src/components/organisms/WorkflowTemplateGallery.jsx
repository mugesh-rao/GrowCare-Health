import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Badge, Modal, Spinner } from '../atoms'
import { workflowTemplateList } from '../../lib/workflowTemplates'

export default function WorkflowTemplateGallery({ open, onClose, onUseTemplate }) {
  const templates = useMemo(() => workflowTemplateList(), [])
  const industries = useMemo(
    () => ['All', ...Array.from(new Set(templates.map((template) => template.industry)))],
    [templates],
  )
  const [industry, setIndustry] = useState('All')
  const [using, setUsing] = useState(null)

  const visible = industry === 'All'
    ? templates
    : templates.filter((template) => template.industry === industry)

  const useTemplate = async (template) => {
    setUsing(template.id)
    try {
      await onUseTemplate(template)
    } finally {
      setUsing(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Start from a template" className="max-w-3xl">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {industries.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setIndustry(item)}
              className={
                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition ' +
                (industry === item
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-line bg-white text-slate-600 hover:border-brand-300')
              }
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((template) => (
            <button
              key={template.id}
              onClick={() => useTemplate(template)}
              disabled={using === template.id}
              className="group flex min-h-36 flex-col gap-2 rounded-xl border border-line p-3.5 text-left transition hover:border-brand-400 hover:bg-brand-50/40 disabled:opacity-60"
            >
              <span className="flex items-center justify-between gap-3">
                <Badge tone="brand">{template.industry}</Badge>
                {using === template.id ? (
                  <Spinner className="h-4 w-4 text-brand-600" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-brand-600" />
                )}
              </span>
              <span className="font-semibold text-ink">{template.name}</span>
              <span className="line-clamp-3 text-xs text-muted">{template.description}</span>
              <span className="mt-auto text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {template.nodes.length} nodes / {template.edges.length} connections
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
