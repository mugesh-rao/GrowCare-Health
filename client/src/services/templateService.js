import api from './api'

const templateService = {
  async list() {
    const { data } = await api.get('/templates')
    return data.templates
  },
  async create(payload) {
    const { data } = await api.post('/templates', payload)
    return data.template
  },
  async update(id, payload) {
    const { data } = await api.put(`/templates/${id}`, payload)
    return data.template
  },
  async remove(id) {
    await api.delete(`/templates/${id}`)
  },
}

export default templateService
