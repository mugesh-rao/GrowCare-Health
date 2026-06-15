import api from './api'

const inboxService = {
  async conversations(params = {}) {
    const { data } = await api.get('/inbox/conversations', { params })
    return data.conversations
  },
  async tags() {
    const { data } = await api.get('/inbox/tags')
    return data.tags
  },
  async messages(phone) {
    const { data } = await api.get(`/inbox/conversations/${phone}/messages`)
    return data.messages
  },
  async reply(phone, payload, opts = {}) {
    const { data } = await api.post(`/inbox/conversations/${phone}/reply`, {
      payload,
      ...opts,
    })
    return data
  },
  async update(phone, patch) {
    const { data } = await api.patch(`/inbox/conversations/${phone}`, patch)
    return data.conversation
  },
  async markRead(phone) {
    await api.post(`/inbox/conversations/${phone}/read`)
  },
  async notes(phone) {
    const { data } = await api.get(`/inbox/conversations/${phone}/notes`)
    return data.notes
  },
  async addNote(phone, body) {
    const { data } = await api.post(`/inbox/conversations/${phone}/notes`, { body })
    return data.note
  },
}

export default inboxService
