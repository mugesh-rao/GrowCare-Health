import api from './api'

const conversationDataService = {
  async deleteConversation(phone) {
    await api.delete(`/inbox/conversations/${encodeURIComponent(phone)}`)
  },
}

export default conversationDataService
