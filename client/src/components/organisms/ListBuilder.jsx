import { Plus, Trash2 } from 'lucide-react'
import { Label } from '../atoms'

const emptyRow = () => ({ title: '', description: '', rowId: '' })
const emptySection = () => ({ title: '', rows: [emptyRow()] })

export default function ListBuilder({ value, onChange }) {
  const list = value || { title: '', buttonText: '', sections: [emptySection()] }
  const sections = Array.isArray(list.sections) && list.sections.length ? list.sections : [emptySection()]

  const update = (patch) => onChange({ ...list, sections, ...patch })
  const updateSection = (index, patch) =>
    update({
      sections: sections.map((section, i) => (i === index ? { ...section, ...patch } : section)),
    })
  const addSection = () => update({ sections: [...sections, emptySection()] })
  const removeSection = (index) => update({ sections: sections.filter((_, i) => i !== index) })
  const updateRow = (sectionIndex, rowIndex, patch) =>
    updateSection(sectionIndex, {
      rows: (sections[sectionIndex].rows || []).map((row, i) =>
        i === rowIndex ? { ...row, ...patch } : row,
      ),
    })
  const addRow = (sectionIndex) =>
    updateSection(sectionIndex, {
      rows: [...(sections[sectionIndex].rows || []), emptyRow()],
    })
  const removeRow = (sectionIndex, rowIndex) =>
    updateSection(sectionIndex, {
      rows: (sections[sectionIndex].rows || []).filter((_, i) => i !== rowIndex),
    })

  return (
    <div className="space-y-3">
      <Label>List message</Label>

      <input
        className="input-base"
        placeholder="List title (optional)"
        value={list.title || ''}
        onChange={(e) => update({ title: e.target.value })}
      />
      <input
        className="input-base"
        placeholder="Open list button text"
        value={list.buttonText || ''}
        onChange={(e) => update({ buttonText: e.target.value })}
      />

      <div className="space-y-3">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="rounded-xl border border-line bg-canvas p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-700">
                Section {sectionIndex + 1}
              </span>
              {sections.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSection(sectionIndex)}
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="Remove section"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <input
              className="input-base mb-2"
              placeholder="Section title (optional)"
              value={section.title || ''}
              onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
            />

            <div className="space-y-2">
              {(section.rows || []).map((row, rowIndex) => (
                <div key={rowIndex} className="rounded-lg border border-line bg-white p-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Row {rowIndex + 1}
                    </span>
                    {(section.rows || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(sectionIndex, rowIndex)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    className="input-base mb-2"
                    placeholder="Row title"
                    value={row.title || ''}
                    onChange={(e) => updateRow(sectionIndex, rowIndex, { title: e.target.value })}
                  />
                  <input
                    className="input-base mb-2"
                    placeholder="Row description (optional)"
                    value={row.description || ''}
                    onChange={(e) =>
                      updateRow(sectionIndex, rowIndex, { description: e.target.value })
                    }
                  />
                  <input
                    className="input-base"
                    placeholder="Row id / payload (optional)"
                    value={row.rowId || ''}
                    onChange={(e) => updateRow(sectionIndex, rowIndex, { rowId: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addRow(sectionIndex)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add row
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSection}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Add section
      </button>
    </div>
  )
}
