const express = require('express')
const { auth } = require('../middleware/auth')
const store = require('../services/store')

const router = express.Router()
router.use(auth)

const base = (uid) => `users/${uid}/products`

// GET /api/products
router.get('/', async (req, res) => {
  const products = await store.listDocs(base(req.user.uid))
  products.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
  res.json({ products })
})

// POST /api/products  { name, price, currency, imageUrl, sku, description, url }
router.post('/', async (req, res) => {
  const { uid } = req.user
  const id = store.genId()
  const b = req.body || {}
  const product = {
    name: b.name || 'Untitled product',
    price: b.price || '',
    currency: b.currency || '₹',
    imageUrl: b.imageUrl || '',
    sku: b.sku || id,
    description: b.description || '',
    url: b.url || '',
    active: b.active !== false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  await store.setDoc(`${base(uid)}/${id}`, product)
  res.status(201).json({ product: { id, ...product } })
})

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  const { uid } = req.user
  const path = `${base(uid)}/${req.params.id}`
  if (!(await store.getDoc(path))) return res.status(404).json({ message: 'Product not found.' })
  const b = req.body || {}
  const fields = ['name', 'price', 'currency', 'imageUrl', 'sku', 'description', 'url', 'active']
  const patch = { updatedAt: Date.now() }
  for (const f of fields) if (b[f] !== undefined) patch[f] = b[f]
  await store.setDoc(path, patch)
  res.json({ product: await store.getDoc(path) })
})

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  await store.deleteDoc(`${base(req.user.uid)}/${req.params.id}`)
  res.json({ ok: true })
})

module.exports = router
