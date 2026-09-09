import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, lstatSync, openSync, closeSync, fsyncSync, unlinkSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'
import { STORE_VERSION, normalizeServer } from './schema.js'

export const emptyStore = () => ({ version: STORE_VERSION, servers: [] })
export const fingerprint = path => existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : null
export function readStoreFile(path) {
  if (!existsSync(path)) return emptyStore()
  if (lstatSync(path).isSymbolicLink()) throw new Error('STORE_SYMLINK')
  const bytes = readFileSync(path)
  if (bytes.length > 4 * 1024 * 1024) throw new Error('STORE_TOO_LARGE')
  const parsed = JSON.parse(bytes.toString('utf8'))
  if (parsed?.version !== STORE_VERSION || !Array.isArray(parsed.servers)) throw new Error('STORE_FORMAT_UNSUPPORTED')
  const servers = parsed.servers.map(row => normalizeServer(row))
  if (new Set(servers.map(s => s.id)).size !== servers.length || new Set(servers.map(s => s.serverName)).size !== servers.length) throw new Error('DUPLICATE_STORE_ID')
  return { version: STORE_VERSION, servers }
}
export function writeStoreFile(path, data) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error('STORE_SYMLINK')
  const tmp = `${path}.${randomUUID()}.tmp`
  let fd
  try {
    fd = openSync(tmp, 'wx', 0o600)
    writeFileSync(fd, `${JSON.stringify(data, null, 2)}\n`); fsyncSync(fd); closeSync(fd); fd = undefined
    renameSync(tmp, path)
    if (process.platform !== 'win32') { const d = openSync(dirname(path), 'r'); try { fsyncSync(d) } finally { closeSync(d) } }
  } finally { if (fd !== undefined) closeSync(fd); if (existsSync(tmp)) unlinkSync(tmp) }
}
