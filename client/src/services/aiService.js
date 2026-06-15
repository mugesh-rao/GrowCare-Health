import api from './api'

const aiService = {
  async providers() {
    const { data } = await api.get('/ai/providers')
    return data.providers
  },
  async models({ provider, apiKey, baseURL }) {
    const { data } = await api.post('/ai/models', { provider, apiKey, baseURL })
    return data // { models, error? }
  },
}

export default aiService
