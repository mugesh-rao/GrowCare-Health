import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Package, Save } from 'lucide-react'
import { Card, Button, Spinner, Modal, Label, Alert, Table } from '../../components/atoms'
import useHeaderActions from '../../hooks/useHeaderActions'
import productService from '../../services/productService'

const empty = { name: '', price: '', currency: 'INR ', imageUrl: '', sku: '', description: '', url: '' }

const toDraft = (product = {}) => ({
  name: product.name || '',
  price: product.price || '',
  currency: product.currency || 'INR ',
  imageUrl: product.imageUrl || '',
  sku: product.sku || '',
  description: product.description || '',
  url: product.url || '',
})

export default function Products() {
  const [products, setProducts] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [savingRow, setSavingRow] = useState(null)
  const [error, setError] = useState('')

  useHeaderActions(
    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ ...empty })}>
      Add product
    </Button>,
  )

  useEffect(() => {
    productService
      .list()
      .then((items) => {
        setProducts(items)
        setDrafts(Object.fromEntries(items.map((product) => [product.id, toDraft(product)])))
      })
      .finally(() => setLoading(false))
  }, [])

  const updateDraft = (id, patch) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] || {}), ...patch },
    }))
  }

  const saveInline = async (product) => {
    const draft = { ...toDraft(product), ...(drafts[product.id] || {}) }
    if (!draft.name.trim()) {
      setError('Give the product a name before saving the row.')
      return
    }
    setError('')
    setSavingRow(product.id)
    try {
      const saved = await productService.update(product.id, draft)
      setProducts((prev) => prev.map((item) => (item.id === saved.id ? saved : item)))
      setDrafts((current) => ({ ...current, [saved.id]: toDraft(saved) }))
    } catch (e) {
      setError(e.message)
    } finally {
      setSavingRow(null)
    }
  }

  const remove = async (id) => {
    await productService.remove(id)
    setProducts((prev) => prev.filter((product) => product.id !== id))
    setDrafts((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  const onSaved = (saved) => {
    setProducts((prev) => {
      const exists = prev.some((product) => product.id === saved.id)
      return exists
        ? prev.map((product) => (product.id === saved.id ? saved : product))
        : [...prev, saved]
    })
    setDrafts((current) => ({ ...current, [saved.id]: toDraft(saved) }))
    setEditing(null)
  }

  return (
    <>
      {loading ? (
        <div className="grid place-items-center py-20">
          <Spinner className="h-8 w-8 text-brand-600" />
        </div>
      ) : products.length === 0 ? (
        <Card>
          <Card.Body className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Package className="h-6 w-6" />
            </span>
            <div>
              <p className="font-semibold text-ink">No products yet</p>
              <p className="text-sm text-muted">Add products to send as a scrollable catalog in your workflows.</p>
            </div>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ ...empty })}>
              Add your first product
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <div className="space-y-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">
                {products.length} product{products.length === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-muted">Edit rows directly, then save the row.</p>
            </div>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing({ ...empty })}>
              Add product
            </Button>
          </div>
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.Th>Image</Table.Th>
                <Table.Th>Product name</Table.Th>
                <Table.Th>Price</Table.Th>
                <Table.Th>SKU</Table.Th>
                <Table.Th>URL</Table.Th>
                <Table.Th className="text-right">Actions</Table.Th>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {products.map((product) => {
                const draft = { ...toDraft(product), ...(drafts[product.id] || {}) }
                return (
                  <Table.Row key={product.id}>
                    <Table.Td>
                      {draft.imageUrl ? (
                        <img
                          src={draft.imageUrl}
                          alt={draft.name || product.name || 'Product'}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="grid h-12 w-12 place-items-center rounded-lg bg-canvas text-slate-300">
                          <Package className="h-5 w-5" />
                        </span>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <input
                        className="input-base min-w-48"
                        value={draft.name}
                        onChange={(e) => updateDraft(product.id, { name: e.target.value })}
                      />
                    </Table.Td>
                    <Table.Td>
                      <div className="flex min-w-40 gap-2">
                        <input
                          className="input-base w-20"
                          value={draft.currency}
                          onChange={(e) => updateDraft(product.id, { currency: e.target.value })}
                          aria-label="Currency"
                        />
                        <input
                          className="input-base w-28"
                          value={draft.price}
                          onChange={(e) => updateDraft(product.id, { price: e.target.value })}
                          aria-label="Price"
                        />
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <input
                        className="input-base min-w-36"
                        value={draft.sku}
                        onChange={(e) => updateDraft(product.id, { sku: e.target.value })}
                      />
                    </Table.Td>
                    <Table.Td>
                      <input
                        className="input-base min-w-64"
                        value={draft.url}
                        onChange={(e) => updateDraft(product.id, { url: e.target.value })}
                        placeholder="https://example.com/product"
                      />
                    </Table.Td>
                    <Table.Td>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          title="Save row"
                          onClick={() => saveInline(product)}
                          disabled={savingRow === product.id}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                        >
                          {savingRow === product.id ? (
                            <Spinner className="h-4 w-4 text-brand-600" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          title="Edit details"
                          onClick={() => setEditing({ ...product, ...(drafts[product.id] || {}) })}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => remove(product.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </Table.Td>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        </div>
      )}

      {editing && <ProductEditor product={editing} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </>
  )
}

function ProductEditor({ product, onClose, onSaved }) {
  const [form, setForm] = useState({ ...empty, ...product })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (patch) => setForm((current) => ({ ...current, ...patch }))

  const save = async () => {
    if (!form.name.trim()) return setError('Give the product a name.')
    setError('')
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        price: form.price,
        currency: form.currency,
        imageUrl: form.imageUrl,
        sku: form.sku,
        description: form.description,
        url: form.url,
      }
      const saved = product.id
        ? await productService.update(product.id, payload)
        : await productService.create(payload)
      onSaved(saved)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={product.id ? 'Edit product' : 'New product'} className="max-w-lg">
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Label required>Name</Label>
            <input className="input-base" value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <Label>Price</Label>
            <input className="input-base" value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="999" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Currency</Label>
            <input className="input-base" value={form.currency} onChange={(e) => set({ currency: e.target.value })} placeholder="INR " />
          </div>
          <div className="col-span-2">
            <Label>Image URL</Label>
            <input className="input-base" value={form.imageUrl} onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://example.com/photo.jpg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>SKU / id</Label>
            <input className="input-base" value={form.sku} onChange={(e) => set({ sku: e.target.value })} placeholder="auto" />
          </div>
          <div>
            <Label>Product URL</Label>
            <input className="input-base" value={form.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://shop.example.com/product" />
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <textarea className="input-base min-h-20" value={form.description} onChange={(e) => set({ description: e.target.value })} />
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button fullWidth loading={saving} onClick={save}>Save product</Button>
        </div>
      </div>
    </Modal>
  )
}
