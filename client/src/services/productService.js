import api from './api'

const productService = {
  async list() {
    const { data } = await api.get('/products')
    return data.products
  },
  async create(payload) {
    const { data } = await api.post('/products', payload)
    return data.product
  },
  async update(id, payload) {
    const { data } = await api.put(`/products/${id}`, payload)
    return data.product
  },
  async remove(id) {
    await api.delete(`/products/${id}`)
  },
}

export default productService
