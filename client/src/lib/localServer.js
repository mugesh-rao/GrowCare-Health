import { invoke } from '@tauri-apps/api/core'

const developmentConfig = {
  baseUrl: 'http://127.0.0.1:5000/api',
  wsUrl: 'ws://127.0.0.1:5000',
}

let configPromise

export function getLocalServerConfig() {
  if (!configPromise) {
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
    configPromise = isTauri
      ? invoke('local_server_config')
      : Promise.resolve(developmentConfig)
  }
  return configPromise
}
