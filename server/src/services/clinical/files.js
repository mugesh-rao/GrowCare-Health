const crypto = require('crypto')
const fs = require('fs/promises')
const path = require('path')

const DATA_DIR = process.env.APP_DATA_DIR || path.join(process.cwd(), '.data')
const DOCUMENT_ROOT = path.join(DATA_DIR, 'documents')

function safeName(value = 'clinical-source') {
  return path.basename(String(value || 'clinical-source'))
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .slice(0, 180) || 'clinical-source'
}

function pathFor(patientId, relativePath) {
  const root = path.resolve(DOCUMENT_ROOT, String(patientId))
  const target = path.resolve(root, String(relativePath || ''))
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Invalid local document path.')
  return target
}

async function storeBase64({ patientId, fileName, fileData }) {
  const dataUrl = String(fileData || '')
  const base64 = dataUrl.includes(',') ? dataUrl.split(',').slice(1).join(',') : dataUrl
  if (!base64) return null
  const bytes = Buffer.from(base64, 'base64')
  if (!bytes.length) return null
  if (bytes.length > 45 * 1024 * 1024) throw new Error('Local clinical files are limited to 45 MB per upload.')

  const hash = crypto.createHash('sha256').update(bytes).digest('hex')
  const directory = path.join(DOCUMENT_ROOT, String(patientId))
  const relativePath = `${hash}-${safeName(fileName)}`
  const target = pathFor(patientId, relativePath)
  await fs.mkdir(directory, { recursive: true })
  try {
    await fs.access(target)
  } catch {
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
    await fs.writeFile(temporary, bytes)
    await fs.rename(temporary, target)
  }
  return { localPath: relativePath, byteSize: bytes.length, sha256: hash }
}

async function readArtifact(patientId, artifact) {
  if (artifact?.localPath) return fs.readFile(pathFor(patientId, artifact.localPath))
  const legacy = String(artifact?.fileData || '')
  if (!legacy) return null
  const base64 = legacy.includes(',') ? legacy.split(',').slice(1).join(',') : legacy
  return Buffer.from(base64, 'base64')
}

async function absoluteArtifactPath(patientId, artifact) {
  if (!artifact?.localPath) return null
  const target = pathFor(patientId, artifact.localPath)
  await fs.access(target)
  return target
}

module.exports = { DOCUMENT_ROOT, storeBase64, readArtifact, absoluteArtifactPath }
