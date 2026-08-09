import api from './api'

const userService = {
  async me() {
    const { data } = await api.get('/user/me')
    return data.user
  },
  async stats() {
    const { data } = await api.get('/user/stats')
    return data.stats
  },
  async updateProfile(payload) {
    const { data } = await api.patch('/user/me', payload)
    return data.user
  },
  async completeOnboarding(payload) {
    const { data } = await api.post('/user/onboarding', payload)
    return data.user
  },
  async getAntiBan() {
    const { data } = await api.get('/user/antiban')
    return data // { config, defaults }
  },
  async updateAntiBan(patch) {
    const { data } = await api.put('/user/antiban', patch)
    return data.config
  },
  async getAiSettings() {
    const { data } = await api.get('/user/ai-settings')
    return data.settings
  },
  async updateAiSettings(patch) {
    const { data } = await api.put('/user/ai-settings', patch)
    return data.settings
  },
}

export default userService
