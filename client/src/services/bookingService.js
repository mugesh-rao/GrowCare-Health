import api from './api'

const bookingService = {
  async list() {
    const { data } = await api.get('/bookings')
    return data.bookings
  },
  async update(id, patch) {
    const { data } = await api.patch(`/bookings/${id}`, patch)
    return data.booking
  },
  async create(payload) {
    const { data } = await api.post('/bookings', payload)
    return data.booking
  },
  async remove(id) {
    await api.delete(`/bookings/${id}`)
  },
  async queue(date) {
    const { data } = await api.get('/bookings/queue/today', { params: date ? { date } : undefined })
    return data
  },
  async checkIn(id, priority = 'routine') {
    const { data } = await api.post(`/bookings/${id}/check-in`, { priority })
    return data.booking
  },
  async queueAction(id, action) {
    const { data } = await api.post(`/bookings/${id}/queue-action`, { action })
    return data.booking
  },
  async reschedule(id, slotIso) {
    const { data } = await api.post(`/bookings/${id}/reschedule`, { slotIso })
    return data.booking
  },
}

export default bookingService
