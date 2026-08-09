import api from './api'

const networkService = {
  async status() {
    const { data } = await api.get('/network/status')
    return data
  },
  async setEnabled(enabled) {
    const { data } = await api.put('/network/status', { enabled })
    return data
  },
  async setDeviceName(deviceName) {
    const { data } = await api.put('/network/status', { deviceName })
    return data
  },
  async discovered() {
    const { data } = await api.get('/network/discovered')
    return data.devices
  },
  async pending() {
    const { data } = await api.get('/network/pending')
    return data.requests
  },
  async outgoing() {
    const { data } = await api.get('/network/outgoing')
    return data.invites
  },
  async paired() {
    const { data } = await api.get('/network/paired')
    return data.devices
  },
  async invite(deviceId) {
    const { data } = await api.post('/network/invite', { deviceId })
    return data
  },
  async accept(requestId) {
    await api.post(`/network/pending/${requestId}/accept`)
  },
  async decline(requestId) {
    await api.post(`/network/pending/${requestId}/decline`)
  },
  async revoke(deviceId) {
    await api.delete(`/network/paired/${deviceId}`)
  },
}

export default networkService
