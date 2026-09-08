import { randomUUID } from 'node:crypto'

export const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/
export const STORE_VERSION = 1

function asRecord(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {}
  const out = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') out[key] = entry
  }
  return out
}

function asStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'string')
}

export function normalizeReconnect(value) {
  const src = value && typeof value === 'object' ? value : {}
  return {
    enabled: src.enabled !== false,
    initialDelayMs: Number.isFinite(src.initialDelayMs) ? src.initialDelayMs : 500,
    maxDelayMs: Number.isFinite(src.maxDelayMs) ? src.maxDelayMs : 30000,
    maxAttempts: Number.isFinite(src.maxAttempts) ? src.maxAttempts : 10,
  }
}

export function normalizeServer(raw, fallbackId) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('server must be an object')
  }
  const transport = raw.transport === 'stdio' ? 'stdio' : 'streamable-http'
  const serverName = String(raw.serverName ?? '').trim()
  if (!SERVER_NAME_PATTERN.test(serverName)) {
    throw new Error('serverName must match [A-Za-z0-9_-]{1,32}')
  }
  const id = String(raw.id ?? fallbackId ?? randomUUID())
  const base = {
    id,
    label: String(raw.label ?? serverName).trim() || serverName,
    enabled: raw.enabled !== false,
    serverName,
    transport,
    toolCallTimeoutMs: Number.isFinite(raw.toolCallTimeoutMs) ? raw.toolCallTimeoutMs : 60000,
    failOnStartupError: false,
    reconnect: normalizeReconnect(raw.reconnect),
  }
  if (transport === 'stdio') {
    const command = String(raw.command ?? '').trim()
    if (!command) throw new Error('stdio transport requires command')
    return {
      ...base,
      command,
      args: asStringArray(raw.args),
      env: asRecord(raw.env),
      cwd: String(raw.cwd ?? ''),
    }
  }
  const url = String(raw.url ?? '').trim()
  if (!url) throw new Error('streamable-http transport requires url')
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('url must be http(s)')
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'invalid url')
  }
  return {
    ...base,
    url,
    headers: asRecord(raw.headers),
  }
}

export function toMcpConfig(server) {
  const reconnect = normalizeReconnect(server.reconnect)
  if (server.transport === 'stdio') {
    return {
      transport: 'stdio',
      serverName: server.serverName,
      command: server.command,
      args: server.args ?? [],
      env: server.env ?? {},
      cwd: server.cwd ?? '',
      toolCallTimeoutMs: server.toolCallTimeoutMs,
      failOnStartupError: false,
      reconnect,
    }
  }
  return {
    transport: 'streamable-http',
    serverName: server.serverName,
    url: server.url,
    headers: server.headers ?? {},
    toolCallTimeoutMs: server.toolCallTimeoutMs,
    failOnStartupError: false,
    reconnect,
  }
}
