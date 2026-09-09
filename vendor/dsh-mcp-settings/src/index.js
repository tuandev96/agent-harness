/** Host-side local MCP administration. Credentials never appear in list responses. */
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { STORE_VERSION, normalizeServer } from './schema.js'
import { emptyStore, fingerprint, readStoreFile, writeStoreFile } from './store.js'
import { MountManager } from './mount-manager.js'
import { guardRequest, readLimitedBody, publicServer, mergePrivateFields, bounded, HttpFault } from './security.js'
export { normalizeServer, toMcpConfig } from './schema.js'
export { MountManager } from './mount-manager.js'
export const name = '@dsh-external/dsh-mcp-settings'
export const inject = ['tools', 'webServer']
const API_PREFIX = '/dsh-mcp-settings/api'
const MCP_CLIENT = '@deepseek-ai/dsh-mcp-client'

async function loadMcpClient(ctx) {
  const loader = ctx.loader ?? ctx.get?.('loader')
  if (loader && typeof loader.import === 'function') {
    const exported = await loader.import(MCP_CLIENT)
    const unwrapped = typeof loader.unwrapExports === 'function' ? loader.unwrapExports(exported) : exported?.default ?? exported
    return unwrapped?.apply ? unwrapped : exported?.default?.apply ? exported.default : exported
  }
  try { return await import(MCP_CLIENT) }
  catch { return import(pathToFileURL(join('/Applications/DSH Desktop.app/Contents/Resources/app.asar.unpacked/node_modules', MCP_CLIENT, 'lib/index.js')).href) }
}
function send(res, code, value) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
  res.end(JSON.stringify(value))
}
function conflicts(ctx, servers) {
  const loader = ctx.loader ?? ctx.get?.('loader')
  if (typeof loader?.entries !== 'function') return false
  const names = new Set(servers.filter(s => s.enabled).map(s => s.serverName))
  return [...loader.entries()].some(e => !e.disabled && e.options?.name === MCP_CLIENT && names.has(e.options?.config?.serverName))
}

export async function apply(ctx) {
  const McpClient = await loadMcpClient(ctx)
  if (!McpClient || typeof McpClient.apply !== 'function') throw new Error('MCP client is not loadable')
  const home = process.env.DSH_HOME?.trim() || join(homedir(), '.dsh')
  const path = join(home, 'mcp-servers.json')
  let data = emptyStore(), storeError = false, previousDigest
  try { data = readStoreFile(path); previousDigest = fingerprint(path) }
  catch { storeError = true; ctx.logger.error('MCP store is invalid; writes disabled until repaired. Original bytes retained.') }
  const manager = new MountManager(ctx, McpClient)
  const conflict = !storeError && conflicts(ctx, data.servers)
  if (conflict) ctx.logger.warn('MCP servers are also configured in the host composition; resolve duplicates before mounting settings-managed instances')
  if (!storeError && !conflict) await manager.sync(data.servers)
  const persist = next => {
    if (storeError) throw new HttpFault(409, 'MCP store requires repair before changes')
    if (fingerprint(path) !== previousDigest) throw new HttpFault(409, 'MCP store changed externally; reload before editing')
    const candidate = { version: STORE_VERSION, servers: next }
    writeStoreFile(path, candidate)
    data = candidate; previousDigest = fingerprint(path)
  }
  const publicList = () => data.servers.map(server => publicServer(server, conflict ? { state: 'error', toolCount: 0, tools: [], error: 'Conflicting host configuration' } : manager.status(server)))
  ctx.effect(() => () => manager.disposeAll(), 'dsh-mcp-settings.mounts')
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix', path: API_PREFIX,
    handler: async (req, res) => {
      try {
        guardRequest(req)
        const auth = ctx.get?.('mcpAdminAuth')
        if (auth && (typeof auth.authorize !== 'function' || await bounded(Promise.resolve(auth.authorize(req)), 10000, 'Host authorization timed out') !== true)) throw new HttpFault(403, 'Host authorization denied')
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!url.pathname.startsWith(API_PREFIX + '/') && url.pathname !== API_PREFIX) throw new HttpFault(404, 'Route not found')
        const route = url.pathname.slice(API_PREFIX.length) || '/'
        if (req.method === 'GET' && (route === '/' || route === '/list')) return send(res, 200, { ok: true, storePath: path, servers: publicList(), readOnly: storeError || conflict, securityMode: 'LOCAL_ASSISTED' })
        if (req.method !== 'POST' || !['/upsert','/toggle','/delete','/reconnect'].includes(route)) throw new HttpFault(404, 'Route not found')
        if (storeError || conflict) throw new HttpFault(409, 'MCP configuration requires repair or conflict resolution before changes')
        const body = await bounded(readLimitedBody(req), 10000, 'Request body timed out')
        await manager.enqueue(async () => {
          if (route === '/upsert') {
            const raw = body.server ?? body
            const prior = data.servers.find(row => row.id === raw?.id)
            let incoming
            try { incoming = normalizeServer(mergePrivateFields(raw, prior)) }
            catch (error) { throw error instanceof HttpFault ? error : new HttpFault(400, 'Invalid MCP server configuration') }
            if (data.servers.some(row => row.serverName === incoming.serverName && row.id !== incoming.id)) throw new HttpFault(400, 'Server name is already used')
            const next = prior ? data.servers.map(row => row.id === incoming.id ? incoming : row) : [...data.servers, incoming]
            persist(next); await manager.mount(incoming); return
          }
          const id = String(body.id ?? '')
          const current = data.servers.find(row => row.id === id)
          if (!current) throw new HttpFault(404, 'Unknown server')
          if (route === '/delete') { await manager.unmount(id); persist(data.servers.filter(row => row.id !== id)); return }
          if (route === '/reconnect') { await manager.mount(current); return }
          if (typeof body.enabled !== 'boolean') throw new HttpFault(400, 'enabled must be boolean')
          const updated = { ...current, enabled: body.enabled }
          persist(data.servers.map(row => row.id === id ? updated : row)); await manager.mount(updated)
        })
        return send(res, 200, { ok: true, servers: publicList() })
      } catch (error) { return send(res, error instanceof HttpFault ? error.status : 500, { ok: false, error: error instanceof HttpFault ? error.message : 'MCP administration failed; stored configuration was not silently reset' }) }
    },
  }), 'dsh-mcp-settings.api')
}
