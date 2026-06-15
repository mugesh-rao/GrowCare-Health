import api from './api'

const waService = {
  async list() {
    const { data } = await api.get('/wa/sessions')
    return data.sessions
  },
  async create(label) {
    const { data } = await api.post('/wa/sessions', { label })
    return data
  },
  async get(id) {
    const { data } = await api.get(`/wa/sessions/${id}`)
    return data
  },
  async logout(id) {
    await api.post(`/wa/sessions/${id}/logout`)
  },
  async remove(id) {
    await api.delete(`/wa/sessions/${id}`)
  },
  async setProxy(id, proxyUrl) {
    const { data } = await api.put(`/wa/sessions/${id}/proxy`, { proxyUrl })
    return data
  },
  // payload: string or { text, footer, title, buttons }
  async send(id, to, payload) {
    const body = typeof payload === 'string' ? { to, text: payload } : { to, ...payload }
    const { data } = await api.post(`/wa/sessions/${id}/send`, body)
    return data
  },
  async bulk(id, recipients, payload) {
    const body =
      typeof payload === 'string'
        ? { recipients, text: payload }
        : { recipients, ...payload }
    const { data } = await api.post(`/wa/sessions/${id}/bulk`, body)
    return data.results
  },
}

export default waService
