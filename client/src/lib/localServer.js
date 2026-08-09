import { invoke } from '@tauri-apps/api/core'

// 2238 is GrowCare's canonical default port (see src-tauri/src/lib.rs and
// server/src/index.js) — every layer defaults to it so nothing has to be
// guessed. Inside Tauri, Rust is the source of truth (it owns the server
// process and can restart it on a new port). Outside Tauri — plain browser
// dev — there's no privileged process to ask, so the last port chosen here
// is remembered in localStorage.
const DEFAULT_PORT = 2238
const DEV_PORT_KEY = 'growcare_dev_port'

export function isTauri() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function devPort() {
  const stored = typeof localStorage !== 'undefined' ? Number(localStorage.getItem(DEV_PORT_KEY)) : NaN
  return stored > 0 ? stored : DEFAULT_PORT
}

function devConfig(port = devPort()) {
  return { baseUrl: `http://127.0.0.1:${port}`, wsUrl: `ws://127.0.0.1:${port}` }
}

async function activeDevConfig() {
  // A normal browser at localhost:5173 cannot invoke Tauri's
  // `local_server_config` command. Probe the small reserved local-port range
  // instead, so browser development follows a port that the desktop app has
  // persisted (for example 2239) without a separate server command.
  const preferred = devPort()
  const candidates = [...new Set([preferred, ...Array.from({ length: 12 }, (_, index) => DEFAULT_PORT + index)])]
  for (const port of candidates) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 500)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: controller.signal })
      if (response.ok) {
        localStorage.setItem(DEV_PORT_KEY, String(port))
        return devConfig(port)
      }
    } catch {
      // Try the next local GrowCare port.
    } finally {
      window.clearTimeout(timeout)
    }
  }
  return devConfig(preferred)
}

let configPromise

export function getLocalServerConfig() {
  if (!configPromise) {
    configPromise = isTauri() ? invoke('local_server_config') : activeDevConfig()
  }
  return configPromise
}

/**
 * Change the local server's port.
 *  - Inside Tauri: Rust kills and restarts the embedded server on the new
 *    port and persists the choice — no app relaunch needed.
 *  - Outside Tauri: there's no process to restart, so the choice is saved
 *    for the next page load (`needsReload: true`).
 */
export async function setLocalServerPort(port) {
  if (isTauri()) {
    const config = await invoke('restart_local_server', { port })
    configPromise = Promise.resolve(config)
    return { config, needsReload: false }
  }
  localStorage.setItem(DEV_PORT_KEY, String(port))
  return { config: devConfig(port), needsReload: true }
}

export function currentDevPort() {
  return devPort()
}

export { DEFAULT_PORT }
