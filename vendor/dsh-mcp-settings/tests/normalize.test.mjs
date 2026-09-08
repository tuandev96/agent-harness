import { strict as assert } from 'node:assert'
import { normalizeServer, toMcpConfig } from '../src/schema.js'

const http = normalizeServer({
  id: 'example-mcp',
  label: 'Example MCP',
  serverName: 'example-mcp',
  transport: 'streamable-http',
  url: 'http://127.0.0.1:8399/mcp',
  toolCallTimeoutMs: 120000,
})
assert.equal(http.serverName, 'example-mcp')
assert.equal(http.transport, 'streamable-http')
assert.equal(toMcpConfig(http).url, 'http://127.0.0.1:8399/mcp')
assert.equal(toMcpConfig(http).failOnStartupError, false)

const stdio = normalizeServer({
  serverName: 'github',
  transport: 'stdio',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-github'],
  env: { GITHUB_TOKEN: 'x' },
})
assert.equal(stdio.command, 'npx')
assert.deepEqual(toMcpConfig(stdio).args, ['-y', '@modelcontextprotocol/server-github'])

assert.throws(() => normalizeServer({ serverName: 'bad name', transport: 'stdio', command: 'x' }))
assert.throws(() => normalizeServer({ serverName: 'web', transport: 'streamable-http', url: 'ftp://x' }))
assert.throws(() => normalizeServer({ serverName: 'web', transport: 'streamable-http' }))

console.log('ok: normalizeServer / toMcpConfig')
