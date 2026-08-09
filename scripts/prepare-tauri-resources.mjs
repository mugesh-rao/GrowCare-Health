import { cp, mkdir, rm, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const resourceRoot = join(root, 'src-tauri', 'resources')
const serverSource = join(root, 'server')
const serverDestination = join(resourceRoot, 'server')
const nodeDestination = join(resourceRoot, 'node', process.platform === 'win32' ? 'node.exe' : 'node')

async function copyServer() {
  await rm(serverDestination, { recursive: true, force: true })
  await cp(serverSource, serverDestination, {
    recursive: true,
    filter: (source) => {
      const relative = source.slice(serverSource.length).replaceAll('\\', '/')
      return !relative.startsWith('/.data') && !relative.startsWith('/.sqlite-') && !relative.startsWith('/logs')
    },
  })
}

await stat(join(serverSource, 'node_modules')).catch(() => {
  throw new Error('Install server dependencies first: npm --prefix server install')
})

await mkdir(dirname(nodeDestination), { recursive: true })
await copyServer()
await cp(process.execPath, nodeDestination, { force: true })

console.log(`Bundled Node ${process.version} and server resources for ${process.platform}.`)
