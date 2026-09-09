export class HttpFault extends Error {
  constructor(status, message) { super(message); this.status = status }
}
const localPeers = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
const sensitive = /token|password|secret|key|credential|authorization/i

/** Local admin REST policy. This is not the MCP OAuth protocol or a same-user sandbox. */
export function guardRequest(req) {
  if (!localPeers.has(req.socket?.remoteAddress)) throw new HttpFault(403, 'MCP administration is loopback-only')
  const host = req.headers?.host
  if (typeof host !== 'string' || /[\s/@\\]/.test(host)) throw new HttpFault(403, 'Invalid admin host')
  let address
  try { address = new URL(`${req.socket?.encrypted ? 'https' : 'http'}://${host}`) } catch { throw new HttpFault(403, 'Invalid admin host') }
  if (!localHosts.has(address.hostname)) throw new HttpFault(403, 'Invalid admin host')
  const origin = req.headers.origin
  if (origin !== undefined && origin !== address.origin) throw new HttpFault(403, 'Cross-origin administration denied')
  if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) throw new HttpFault(403, 'Cross-site administration denied')
  if (req.method !== 'GET') {
    if (origin !== address.origin && req.headers['sec-fetch-site'] !== 'same-origin') throw new HttpFault(403, 'Same-origin request required')
    if (!/^application\/json(?:;|$)/i.test(String(req.headers['content-type'] ?? ''))) throw new HttpFault(415, 'JSON body required')
  }
}

export async function readLimitedBody(req, maxBytes = 262144) {
  const length = req.headers?.['content-length']
  if (length !== undefined && (!/^\d+$/.test(String(length)) || Number(length) > maxBytes)) throw new HttpFault(413, 'Request body too large')
  const chunks = []; let bytes = 0
  for await (const chunk of req) {
    const data = Buffer.from(chunk); bytes += data.length
    if (bytes > maxBytes) throw new HttpFault(413, 'Request body too large')
    chunks.push(data)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  try {
    const body = text.trim() ? JSON.parse(text) : {}
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Error('object')
    return body
  } catch { throw new HttpFault(400, 'Invalid JSON object') }
}

export function publicUrl(value, clear = false) {
  if (!value) return value
  try {
    const url = new URL(value)
    url.username = ''; url.password = ''
    for (const key of [...url.searchParams.keys()]) if (sensitive.test(key)) {
      if (clear) url.searchParams.delete(key)
      else url.searchParams.set(key, '[REDACTED]')
    }
    url.hash = ''
    return url.toString()
  } catch { return '(invalid endpoint)' }
}

export function publicServer(server, status) {
  const { headers, env, args, url, ...visible } = server
  return {
    ...visible,
    ...(url ? {url: publicUrl(url)} : {}),
    headers: {}, env: {}, args: [],
    headersConfigured: Object.keys(headers ?? {}).length > 0,
    envConfigured: Object.keys(env ?? {}).length > 0,
    argsConfigured: (args ?? []).length > 0,
    status: {...status, error: status?.error ? 'MCP connection or disposal failed; inspect local diagnostics' : null},
  }
}

/** Blank private fields preserve saved values; deletion requires an explicit clear action. */
export function mergePrivateFields(incoming, previous) {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw new HttpFault(400, 'Server object required')
  if (incoming.clearSecrets !== undefined && typeof incoming.clearSecrets !== 'boolean') throw new HttpFault(400, 'clearSecrets must be boolean')
  const out = {...incoming}
  if (!previous || previous.transport !== (incoming.transport ?? 'streamable-http')) return out
  const clear = incoming.clearSecrets === true
  for (const field of ['headers', 'env', 'args']) {
    if (out[field] === undefined || (typeof out[field] === 'object' && out[field] !== null && Object.keys(out[field]).length === 0)) {
      out[field] = clear ? (field === 'args' ? [] : {}) : previous[field]
    }
  }
  if (previous.url && (out.url === publicUrl(previous.url) || out.url === undefined)) out.url = clear ? publicUrl(previous.url, true) : previous.url
  if (typeof out.url === 'string' && /(?:\[REDACTED\]|%5BREDACTED%5D)/i.test(out.url)) throw new HttpFault(400, 'Re-enter the full connection URL when changing a masked endpoint')
  return out
}

export function safeError(error, server) {
  let message = error instanceof Error ? error.message : String(error)
  const values = [...Object.values(server?.headers ?? {}), ...Object.values(server?.env ?? {}), ...(server?.args ?? [])]
  if (server?.url) try {
    const url = new URL(server.url)
    if (url.password) values.push(url.password)
    for (const [key, value] of url.searchParams) if (sensitive.test(key)) values.push(value)
  } catch { /* invalid URL has no diagnostics to expose */ }
  for (const value of values.filter(v => typeof v === 'string' && v.length > 2).sort((a,b) => b.length-a.length)) message = message.split(value).join('[REDACTED]')
  return message.replace(/(Bearer\s+)[^\s"']+/gi, '$1[REDACTED]')
}

export async function bounded(promise, ms, label) {
  let timer
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new HttpFault(503, label)), ms) })]) }
  finally { clearTimeout(timer) }
}
