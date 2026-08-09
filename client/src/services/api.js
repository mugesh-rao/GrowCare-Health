import axios from 'axios'
import { getLocalServerConfig } from '../lib/localServer'

/**
 * Every request is routed to the server process that Tauri starts locally.
 */
const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

api.interceptors.request.use(async (config) => {
  const server = await getLocalServerConfig()
  config.baseURL = server.baseUrl
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Something went wrong. Please try again.'
    return Promise.reject(new Error(message))
  },
)

export default api
