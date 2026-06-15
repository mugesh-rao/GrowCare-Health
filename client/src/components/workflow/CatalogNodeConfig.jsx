import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Label } from '../atoms'
import productService from '../../services/productService'

/** Catalog node config — pick which products to send (empty = all active). */
export default function CatalogNodeConfig({ data, update }) {
  const [products, setProducts] = useState([])
  const [loaded, setLoaded] = useState(false)
  const selected = Array.isArray(data.productIds) ? data.productIds : []

  useEffect(() => {
    productService.list().then(setProducts).catch(() => {}).finally(() => setLoaded(true))
  }, [])

  const toggle = (id) => {
    update({ productIds: selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id] })
  }

  return (
    <>
      <div>
        <Label>Intro message</Label>
        <input
          className="input-base"
          placeholder="Here are our products 👇"
          value={data.message || ''}
          onChange={(e) => update({ message: e.target.value })}
        />
      </div>
      <div>
        <Label>Products ({selected.length ? `${selected.length} selected` : 'all active'})</Label>
        {!loaded ? (
          <p className="text-xs text-muted">Loading…</p>
        ) : products.length === 0 ? (
          <p className="text-xs text-muted">
            No products yet.{' '}
            <Link to="/dashboard/products" className="font-medium text-brand-600">Add products</Link>{' '}
            first.
          </p>
        ) : (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
            {products.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
                <span className="truncate text-ink">{p.name}</span>
                <span className="ml-auto shrink-0 text-xs text-muted">{p.price ? `${p.currency || ''}${p.price}` : ''}</span>
              </label>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-xs text-muted">Leave all unchecked to send every active product.</p>
      </div>
    </>
  )
}
