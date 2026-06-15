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
  async remove(id) {
    await api.delete(`/bookings/${id}`)
  },
}

export default bookingService
