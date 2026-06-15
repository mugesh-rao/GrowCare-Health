import axios from 'axios'
import { firebaseEnabled, getIdToken } from '../lib/firebase'

/**
 * Central axios instance. baseURL "/api" uses the Vite dev proxy → Node server,
 * and works in production behind a reverse proxy. Every request carries the
 * Firebase ID token (or a dev identity when Firebase isn't configured).
 */
const api = axios.create({
  // baseURL:  'http://localhost:8080/api',
  baseURL:  'https://growto-automation.onrender.com/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

api.interceptors.request.use(async (config) => {
  if (firebaseEnabled) {
    const token = await getIdToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
  } else {
    // Dev mode pairs with the server's dev auth.
    config.headers.Authorization = 'Bearer dev'
    config.headers['x-dev-uid'] =
      localStorage.getItem('wa_dev_uid') || 'dev-user'
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong. Please try again.'
    return Promise.reject(new Error(message))
  },
)

export default api
