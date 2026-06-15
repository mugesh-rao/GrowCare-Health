import api, { tokenStore } from './api'

/**
 * authService — all auth-related network calls in one place.
 * Components/pages never call axios directly; they call these.
 */
const authService = {
  async register({ name, email, password }) {
    const { data } = await api.post('/auth/register', { name, email, password })
    if (data.token) tokenStore.set(data.token)
    return data
  },

  async login({ email, password }) {
    const { data } = await api.post('/auth/login', { email, password })
    if (data.token) tokenStore.set(data.token)
    return data
  },

  async me() {
    const { data } = await api.get('/auth/me')
    return data.user
  },

  logout() {
    tokenStore.clear()
  },

  isAuthenticated() {
    return Boolean(tokenStore.get())
  },
}

export default authService
