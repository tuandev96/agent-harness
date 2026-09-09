import { toMcpConfig } from './schema.js'
import { bounded, safeError, HttpFault } from './security.js'

export class MountManager {
  constructor(ctx, McpClient, timeoutMs = 10000) {
    this.ctx = ctx; this.McpClient = McpClient; this.timeoutMs = timeoutMs
    this.mounts = new Map(); this.chain = Promise.resolve(); this.closed = false
  }
  enqueue(work) {
    if (this.closed) return Promise.reject(new HttpFault(503, 'MCP manager closed'))
    const run = this.chain.then(work, work); this.chain = run.catch(() => {}); return run
  }
  async disposeFiber(fiber) {
    if (typeof fiber?.dispose === 'function') await fiber.dispose()
    else if (typeof fiber === 'function') await fiber()
  }
  async unmount(id) {
    const current = this.mounts.get(id)
    if (!current) return
    try {
      if (current.pending) await bounded(current.pending, this.timeoutMs, 'Previous MCP mount has not settled')
      await bounded(this.disposeFiber(current.fiber), this.timeoutMs, 'MCP disposal timed out')
      this.mounts.delete(id)
    } catch {
      current.error = 'MCP disposal failed; previous instance may still be active'
      throw new HttpFault(503, current.error)
    }
  }
  async mount(server) {
    await this.unmount(server.id)
    const record = { fiber: null, pending: null, error: null, enabled: server.enabled }
    this.mounts.set(server.id, record)
    if (!server.enabled) return
    let abandoned = false
    const start = Promise.resolve().then(() => this.ctx.plugin(this.McpClient, toMcpConfig(server)))
    record.pending = start.then(async fiber => {
      record.fiber = fiber
      if (abandoned) {
        await bounded(this.disposeFiber(fiber), this.timeoutMs, 'Late MCP cleanup timed out')
        record.fiber = null
      }
    }).finally(() => { record.pending = null })
    record.pending.catch(() => {})
    try {
      const fiber = await bounded(start, this.timeoutMs, 'MCP mount timed out')
      record.fiber = fiber
      if (fiber?.inertia) await bounded(fiber.inertia, this.timeoutMs, 'MCP startup timed out')
    } catch (error) {
      abandoned = true
      record.error = safeError(error, server)
      if (record.fiber) try {
        await bounded(this.disposeFiber(record.fiber), this.timeoutMs, 'MCP cleanup timed out')
        record.fiber = null
      } catch { record.error = 'MCP cleanup failed; previous instance may still be active' }
      this.ctx.logger.warn(`MCP ${server.serverName}: ${record.error}`)
    }
  }
  async disposeAll() {
    this.closed = true; await this.chain
    const failed = []
    for (const id of [...this.mounts.keys()]) try { await this.unmount(id) } catch { failed.push(id) }
    if (failed.length) throw new Error('Some MCP instances could not be disposed')
  }
  async sync(servers) {
    const keep = new Set(servers.map(row => row.id))
    for (const id of [...this.mounts.keys()]) if (!keep.has(id)) await this.unmount(id)
    for (const server of servers) await this.mount(server)
  }
  status(server) {
    const record = this.mounts.get(server.id)
    if (record?.error) return { state: 'error', toolCount: 0, tools: [], error: record.error }
    if (!server.enabled) return { state: 'disabled', toolCount: 0, tools: [], error: null }
    let tools = []
    try { tools = this.ctx.tools.schemas().map(s => s.name).filter(name => typeof name === 'string' && name.startsWith(`mcp__${server.serverName}__`)) } catch { /* absent registry is not connected */ }
    return tools.length ? { state: 'connected', toolCount: tools.length, tools: tools.slice(0, 24), error: null }
      : { state: 'connecting', toolCount: 0, tools: [], error: null }
  }
}
