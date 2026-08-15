import { cp, mkdir, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const resourceRoot = join(root, 'src-tauri', 'resources')
const serverSource = join(root, 'server')
const serverDestination = join(resourceRoot, 'server')
const packagedServerModules = join(serverDestination, 'node_modules')
const nodeDestination = join(resourceRoot, 'node', process.platform === 'win32' ? 'node.exe' : 'node')

async function copyServer() {
  await cp(serverSource, serverDestination, {
    recursive: true,
    force: true,
    filter: (source) => {
      const relative = source.slice(serverSource.length).replaceAll('\\', '/')
      return !relative.startsWith('/node_modules') && !relative.startsWith('/.data') && !relative.startsWith('/.sqlite-') && !relative.startsWith('/logs')
    },
  })
  // Keep the runtime dependency tree aligned with the server. The Tauri
  // process is stopped before this preparation step, so overwriting these
  // generated resources is safe and prevents stale bundles after npm install.
  await cp(join(serverSource, 'node_modules'), packagedServerModules, { recursive: true, force: true })
}

await stat(join(serverSource, 'node_modules')).catch(() => {
  throw new Error('Install server dependencies first: npm --prefix server install')
})

await mkdir(dirname(nodeDestination), { recursive: true })
await copyServer()
await stat(nodeDestination).catch(() => cp(process.execPath, nodeDestination))

console.log(`Bundled Node ${process.version} and server resources for ${process.platform}.`)
