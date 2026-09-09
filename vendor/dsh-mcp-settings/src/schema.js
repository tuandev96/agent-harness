import { randomUUID } from 'node:crypto'
export const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/
export const STORE_VERSION = 1
function limit(value, fallback, min, max) {
  const v = value === undefined ? fallback : value
  if (!Number.isInteger(v) || v < min || v > max) throw new Error('invalid numeric limit')
  return v
}
function boolean(value, fallback) {
  if (value === undefined) return fallback
  if (typeof value !== 'boolean') throw new Error('expected boolean')
  return value
}
function asRecord(value) {
  if (value === undefined) return {}
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('expected string record')
  const out = Object.create(null)
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'string') throw new Error('expected string value')
    out[key] = entry
  }
  return out
}
function asStringArray(value) {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error('expected string array')
  return [...value]
}
export function normalizeReconnect(value) {
  const src = value ?? {}
  if (typeof src !== 'object' || Array.isArray(src)) throw new Error('invalid reconnect object')
  const initialDelayMs = limit(src.initialDelayMs, 500, 10, 300000)
  const maxDelayMs = limit(src.maxDelayMs, 30000, initialDelayMs, 600000)
  return { enabled: boolean(src.enabled, true), initialDelayMs, maxDelayMs, maxAttempts: limit(src.maxAttempts, 10, 0, 100) }
}
export function normalizeServer(raw, fallbackId) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('server must be an object')
  if (raw.transport !== undefined && !['stdio', 'streamable-http'].includes(raw.transport)) throw new Error('unsupported transport')
  const transport = raw.transport ?? 'streamable-http'
  const serverName = String(raw.serverName ?? '').trim()
  if (!SERVER_NAME_PATTERN.test(serverName)) throw new Error('serverName must match [A-Za-z0-9_-]{1,32}')
  const id = String(raw.id ?? fallbackId ?? randomUUID())
  if (!id || id.length > 128) throw new Error('invalid server id')
  const base = { id, label: String(raw.label ?? serverName).trim() || serverName,
    enabled: boolean(raw.enabled, true), serverName, transport,
    toolCallTimeoutMs: limit(raw.toolCallTimeoutMs, 60000, 1000, 600000),
    failOnStartupError: false, reconnect: normalizeReconnect(raw.reconnect) }
  if (transport === 'stdio') {
    const command = String(raw.command ?? '').trim()
    if (!command) throw new Error('stdio transport requires command')
    return { ...base, command, args: asStringArray(raw.args), env: asRecord(raw.env), cwd: String(raw.cwd ?? '') }
  }
  const url = String(raw.url ?? '').trim()
  if (!url) throw new Error('streamable-http transport requires url')
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('url must be http(s)')
  return { ...base, url, headers: asRecord(raw.headers) }
}
export function toMcpConfig(server) {
  const base = { transport: server.transport, serverName: server.serverName, toolCallTimeoutMs: server.toolCallTimeoutMs,
    failOnStartupError: false, reconnect: normalizeReconnect(server.reconnect) }
  return server.transport === 'stdio'
    ? { ...base, command: server.command, args: server.args ?? [], env: server.env ?? {}, cwd: server.cwd ?? '' }
    : { ...base, url: server.url, headers: server.headers ?? {} }
}
