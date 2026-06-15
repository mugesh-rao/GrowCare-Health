import api from './api'

const flowService = {
  async list() {
    const { data } = await api.get('/flows')
    return data.flows
  },
  async create(input = 'Untitled flow') {
    const payload = typeof input === 'string' ? { name: input } : input
    const { data } = await api.post('/flows', payload)
    return data.flow
  },
  async get(id) {
    const { data } = await api.get(`/flows/${id}`)
    return data.flow
  },
  async save(id, { name, nodes, edges }) {
    const { data } = await api.put(`/flows/${id}`, { name, nodes, edges })
    return data.flow
  },
  async publish(id, publish, boundSessionIds) {
    const { data } = await api.post(`/flows/${id}/publish`, {
      publish,
      boundSessionIds,
    })
    return data.flow
  },
  async remove(id) {
    await api.delete(`/flows/${id}`)
  },
  async createFromTemplate(template) {
    return this.create({
      name: template.name,
      nodes: template.nodes,
      edges: template.edges,
    })
  },
}

export default flowService
