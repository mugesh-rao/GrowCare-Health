import { Label } from '../atoms'

/** Legacy config for old catalog nodes after clinic mode removed commerce pages. */
export default function CatalogNodeConfig({ data, update }) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Intro message</Label>
        <input
          className="input-base"
          placeholder="Here are the options available for this patient."
          value={data.message || ''}
          onChange={(e) => update({ message: e.target.value })}
        />
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
        Product catalog management has been removed from the clinic workspace. For new
        workflows, replace this node with a list, buttons, or carousel message.
      </div>
    </div>
  )
}
