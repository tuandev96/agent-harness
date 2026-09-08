/**
 * Host half of Settings → MCP.
 * Persists servers to ~/.dsh/mcp-servers.json and live-mounts each enabled
 * row as @deepseek-ai/dsh-mcp-client (tools: mcp__<serverName>__<tool>).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { STORE_VERSION, normalizeServer, toMcpConfig } from './schema.js'

export { normalizeServer, toMcpConfig } from './schema.js'

export const name = '@dsh-external/dsh-mcp-settings'
export const inject = ['tools', 'webServer']

const API_PREFIX = '/dsh-mcp-settings/api'
const MCP_CLIENT = '@deepseek-ai/dsh-mcp-client'

function dshHome() {
  const env = process.env.DSH_HOME
  if (typeof env === 'string' && env.trim()) return env.trim()
  return join(homedir(), '.dsh')
}

function storePath() {
  return join(dshHome(), 'mcp-servers.json')
}

function emptyStore() {
  return { version: STORE_VERSION, servers: [] }
}

function readStoreFile(path) {
  if (!existsSync(path)) return { created: true, data: emptyStore() }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    const servers = Array.isArray(parsed?.servers) ? parsed.servers.map((row) => normalizeServer(row)) : []
    return { created: false, data: { version: STORE_VERSION, servers } }
  } catch (error) {
    throw new Error(`mcp-servers.json is invalid: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function writeStoreFile(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  const tmp = `${path}.${process.pid}.tmp`
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  renameSync(tmp, path)
}

async function loadMcpClient(ctx) {
  const loader = ctx.loader ?? ctx.get?.('loader')
  if (loader && typeof loader.import === 'function') {
    const exported = await loader.import(MCP_CLIENT)
    const unwrapped = typeof loader.unwrapExports === 'function' ? loader.unwrapExports(exported) : (exported?.default ?? exported)
    return unwrapped?.apply ? unwrapped : (exported?.default?.apply ? exported.default : exported)
  }
  try {
    return await import(MCP_CLIENT)
  } catch {
    const fallback = join(
      '/Applications/DSH Desktop.app/Contents/Resources/app.asar.unpacked/node_modules',
      MCP_CLIENT,
      'lib/index.js',
    )
    return await import(pathToFileURL(fallback).href)
  }
}

function toolPrefix(serverName) {
  return `mcp__${serverName}__`
}

function listedTools(ctx, serverName) {
  const prefix = toolPrefix(serverName)
  try {
    const schemas = ctx.tools.schemas()
    return schemas.map((schema) => schema.name).filter((name) => typeof name === 'string' && name.startsWith(prefix))
  } catch {
    return []
  }
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text.trim()) return {}
  return JSON.parse(text)
}

function send(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(obj))
}

function findYamlMcpEntries(ctx) {
  const loader = ctx.loader ?? ctx.get?.('loader')
  if (!loader || typeof loader.entries !== 'function') return []
  const found = []
  for (const entry of loader.entries()) {
    const options = entry?.options ?? {}
    if (options.name !== MCP_CLIENT) continue
    found.push(entry)
  }
  return found
}

async function disableConflictingYaml(ctx, ownedNames, log) {
  for (const entry of findYamlMcpEntries(ctx)) {
    const id = String(entry.options?.id ?? '')
    const serverName = String(entry.options?.config?.serverName ?? '')
    const clash = ownedNames.has(serverName)
    if (!clash) continue
    if (entry.disabled) continue
    try {
      if (typeof entry.update === 'function') {
        await entry.update({ disabled: true })
      } else if (typeof entry._dispose === 'function') {
        await entry._dispose()
      }
      log?.info?.(`dsh-mcp-settings: disabled loader entry ${id || serverName} (moved to Settings → MCP)`)
    } catch (error) {
      log?.warn?.(`dsh-mcp-settings: could not disable ${id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

class MountManager {
  constructor(ctx, McpClient) {
    this.ctx = ctx
    this.McpClient = McpClient
    this.mounts = new Map()
    this.chain = Promise.resolve()
  }

  enqueue(work) {
    const run = this.chain.then(work, work)
    this.chain = run.catch(() => {})
    return run
  }

  async disposeAll() {
    const ids = [...this.mounts.keys()]
    for (const id of ids) await this.unmount(id)
  }

  async unmount(id) {
    const current = this.mounts.get(id)
    if (!current) return
    this.mounts.delete(id)
    const fiber = current.fiber
    if (!fiber) return
    try {
      if (typeof fiber.dispose === 'function') await fiber.dispose()
      else if (typeof fiber === 'function') await fiber()
    } catch (error) {
      this.ctx.logger.warn(`dsh-mcp-settings: unmount ${id} failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async mount(server) {
    await this.unmount(server.id)
    if (!server.enabled) {
      this.mounts.set(server.id, { fiber: null, serverName: server.serverName, error: null, enabled: false })
      return
    }
    try {
      const fiber = await this.ctx.plugin(this.McpClient, toMcpConfig(server))
      if (fiber?.inertia) await fiber.inertia
      this.mounts.set(server.id, { fiber, serverName: server.serverName, error: null, enabled: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.mounts.set(server.id, { fiber: null, serverName: server.serverName, error: message, enabled: true })
      this.ctx.logger.warn(`dsh-mcp-settings: mount ${server.serverName} failed: ${message}`)
    }
  }

  async sync(servers) {
    const keep = new Set(servers.map((row) => row.id))
    for (const id of [...this.mounts.keys()]) {
      if (!keep.has(id)) await this.unmount(id)
    }
    for (const server of servers) await this.mount(server)
  }

  status(server) {
    const mount = this.mounts.get(server.id)
    if (!server.enabled) {
      return { state: 'disabled', toolCount: 0, tools: [], error: null }
    }
    if (mount?.error) {
      return { state: 'error', toolCount: 0, tools: [], error: mount.error }
    }
    const tools = listedTools(this.ctx, server.serverName)
    if (tools.length > 0) {
      return { state: 'connected', toolCount: tools.length, tools: tools.slice(0, 24), error: null }
    }
    return { state: 'connecting', toolCount: 0, tools: [], error: null }
  }
}

export async function apply(ctx) {
  const McpClient = await loadMcpClient(ctx)
  if (!McpClient || typeof McpClient.apply !== 'function') {
    throw new Error('dsh-mcp-settings: @deepseek-ai/dsh-mcp-client is not loadable')
  }

  const path = storePath()
  let data
  try {
    data = readStoreFile(path).data
  } catch (error) {
    ctx.logger.error(String(error))
    data = emptyStore()
  }
  const manager = new MountManager(ctx, McpClient)
  const owned = new Set(data.servers.map((row) => row.serverName))
  await disableConflictingYaml(ctx, owned, ctx.logger)
  await manager.sync(data.servers)

  const persist = (next) => {
    data = { version: STORE_VERSION, servers: next }
    writeStoreFile(path, data)
  }

  const publicList = () => data.servers.map((server) => ({
    ...server,
    status: manager.status(server),
  }))

  ctx.effect(() => () => {
    void manager.disposeAll()
  }, 'dsh-mcp-settings.mounts')

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: API_PREFIX,
    handler: async (req, res) => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const route = url.pathname.replace(API_PREFIX, '') || '/'
        if (req.method === 'GET' && (route === '/' || route === '/list')) {
          return send(res, 200, { ok: true, storePath: path, servers: publicList() })
        }
        if (req.method === 'POST' && route === '/upsert') {
          const body = await readBody(req)
          let incoming
          try {
            incoming = normalizeServer(body.server ?? body)
          } catch (error) {
            return send(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
          }
          const duplicate = data.servers.find((row) => row.serverName === incoming.serverName && row.id !== incoming.id)
          if (duplicate) return send(res, 400, { ok: false, error: `serverName "${incoming.serverName}" is already used` })
          const next = data.servers.some((row) => row.id === incoming.id)
            ? data.servers.map((row) => (row.id === incoming.id ? incoming : row))
            : [...data.servers, incoming]
          persist(next)
          await manager.enqueue(() => manager.mount(incoming))
          return send(res, 200, { ok: true, servers: publicList() })
        }
        if (req.method === 'POST' && route === '/toggle') {
          const body = await readBody(req)
          const id = String(body.id ?? '')
          const current = data.servers.find((row) => row.id === id)
          if (!current) return send(res, 404, { ok: false, error: 'unknown server' })
          const updated = { ...current, enabled: Boolean(body.enabled) }
          persist(data.servers.map((row) => (row.id === id ? updated : row)))
          await manager.enqueue(() => manager.mount(updated))
          return send(res, 200, { ok: true, servers: publicList() })
        }
        if (req.method === 'POST' && route === '/delete') {
          const body = await readBody(req)
          const id = String(body.id ?? '')
          if (!data.servers.some((row) => row.id === id)) return send(res, 404, { ok: false, error: 'unknown server' })
          persist(data.servers.filter((row) => row.id !== id))
          await manager.enqueue(() => manager.unmount(id))
          return send(res, 200, { ok: true, servers: publicList() })
        }
        if (req.method === 'POST' && route === '/reconnect') {
          const body = await readBody(req)
          const id = String(body.id ?? '')
          const current = data.servers.find((row) => row.id === id)
          if (!current) return send(res, 404, { ok: false, error: 'unknown server' })
          await manager.enqueue(() => manager.mount(current))
          return send(res, 200, { ok: true, servers: publicList() })
        }
        return send(res, 404, { ok: false, error: `not found: ${route}` })
      } catch (error) {
        return send(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'dsh-mcp-settings.api')
}
