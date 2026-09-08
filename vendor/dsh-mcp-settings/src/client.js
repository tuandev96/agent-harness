/**
 * Browser half: Settings → MCP.
 * Host slot contract: register(descriptor, ReactComponent).
 */
import { createElement as h, useCallback, useEffect, useMemo, useState } from 'react'

export const inject = ['slots']

const API = '/dsh-mcp-settings/api'
const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/

/** Two endpoints + a protocol node — distinct from the settings-gear fallback. */
function McpGlyph({ size = 16, className }) {
  return h('svg', {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    className,
    'aria-hidden': 'true',
    'data-mcp-icon': '1',
  },
    h('circle', { cx: '3.5', cy: '8', r: '2.35', stroke: 'currentColor', strokeWidth: '1.25' }),
    h('circle', { cx: '12.5', cy: '8', r: '2.35', stroke: 'currentColor', strokeWidth: '1.25' }),
    h('path', { d: 'M5.85 8h4.3', stroke: 'currentColor', strokeWidth: '1.25', strokeLinecap: 'round' }),
    h('circle', { cx: '8', cy: '8', r: '1.05', fill: 'currentColor' }),
  )
}

const MCP_GLYPH_INNER = `
  <circle cx="3.5" cy="8" r="2.35" stroke="currentColor" stroke-width="1.25" fill="none"/>
  <circle cx="12.5" cy="8" r="2.35" stroke="currentColor" stroke-width="1.25" fill="none"/>
  <path d="M5.85 8h4.3" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" fill="none"/>
  <circle cx="8" cy="8" r="1.05" fill="currentColor"/>
`

/** Settings nav maps icons by hardcoded id; unknown ids get a gear. Swap ours in. */
function installMcpNavIcon() {
  const paint = () => {
    for (const btn of document.querySelectorAll('button')) {
      const labeled = [...btn.querySelectorAll('span')].some((span) => span.textContent.trim() === 'MCP')
      if (!labeled) continue
      const svg = btn.querySelector('svg')
      if (!svg || svg.getAttribute('data-mcp-icon') === '1') continue
      svg.setAttribute('data-mcp-icon', '1')
      svg.setAttribute('viewBox', '0 0 16 16')
      svg.setAttribute('fill', 'none')
      svg.innerHTML = MCP_GLYPH_INNER
    }
  }
  paint()
  const observer = new MutationObserver(paint)
  observer.observe(document.body, { childList: true, subtree: true })
  return () => observer.disconnect()
}

const styles = `
.mcp-page{padding:4px 2px 24px;max-width:720px;color:var(--dsw-alias-label-primary,#e8e8e8);font:13px/1.5 ui-sans-serif,system-ui,sans-serif}
.mcp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}
.mcp-title{margin:0;font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px}
.mcp-title svg{flex:none;color:currentColor}
.mcp-intro{margin:4px 0 0;color:var(--dsw-alias-label-secondary,#9a9a9a);font-size:12px;max-width:46ch}
.mcp-btn{border:0;border-radius:8px;padding:6px 12px;font:inherit;font-size:12px;cursor:pointer;background:var(--dsw-alias-state-business-primary,#4a9eff);color:#fff}
.mcp-btn:disabled{opacity:.45;cursor:not-allowed}
.mcp-btn.ghost{background:transparent;border:1px solid var(--dsw-alias-border-l1,#333);color:var(--dsw-alias-label-primary,#ddd)}
.mcp-btn.danger{background:transparent;border:1px solid var(--dsw-alias-state-error-primary,#d33);color:var(--dsw-alias-state-error-primary,#d33)}
.mcp-empty{padding:28px 12px;text-align:center;color:var(--dsw-alias-label-caption,#888);border:1px dashed var(--dsw-alias-border-l1,#333);border-radius:10px}
.mcp-card{border:1px solid var(--dsw-alias-border-l1,#333);border-radius:10px;padding:12px 14px;margin-bottom:8px;background:var(--dsw-alias-bg-elevated,transparent)}
.mcp-card-top{display:flex;align-items:center;gap:8px}
.mcp-name{font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mcp-meta{margin:4px 0 0;color:var(--dsw-alias-label-caption,#888);font-size:12px;word-break:break-all}
.mcp-tools{margin:6px 0 0;color:var(--dsw-alias-label-secondary,#aaa);font-size:11px;font-family:ui-monospace,monospace}
.mcp-actions{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
.mcp-pill{font-size:10px;padding:2px 8px;border-radius:999px;white-space:nowrap}
.mcp-pill.on{background:rgba(46,204,113,.15);color:#2ecc71}
.mcp-pill.wait{background:rgba(241,196,15,.12);color:#f1c40f}
.mcp-pill.off{background:rgba(255,255,255,.06);color:var(--dsw-alias-label-caption,#888)}
.mcp-pill.err{background:rgba(211,51,51,.12);color:#e74c3c}
.mcp-form{border:1px solid var(--dsw-alias-border-l1,#333);border-radius:10px;padding:14px;margin-bottom:14px;display:flex;flex-direction:column;gap:10px}
.mcp-field{display:flex;flex-direction:column;gap:4px}
.mcp-field span{font-size:11px;color:var(--dsw-alias-label-secondary,#999)}
.mcp-field input,.mcp-field select,.mcp-field textarea{background:var(--dsw-alias-bg-base,#111);color:inherit;border:1px solid var(--dsw-alias-border-l1,#333);border-radius:8px;padding:7px 9px;font:inherit;font-size:12px}
.mcp-field textarea{min-height:72px;font-family:ui-monospace,monospace;resize:vertical}
.mcp-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mcp-check{display:flex;align-items:center;gap:8px;font-size:12px}
.mcp-err{color:#e74c3c;font-size:12px;margin:0}
.mcp-msg{margin:0 0 12px;padding:8px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1,#333);font-size:12px;white-space:pre-wrap}
`

function emptyDraft() {
  return {
    id: '',
    label: '',
    serverName: '',
    enabled: true,
    transport: 'streamable-http',
    url: '',
    headersText: '',
    command: '',
    argsText: '',
    envText: '',
    cwd: '',
    toolCallTimeoutMs: 60000,
    reconnectEnabled: true,
  }
}

function kvToText(record) {
  if (!record || typeof record !== 'object') return ''
  return Object.entries(record).map(([k, v]) => `${k}=${v}`).join('\n')
}

function textToKv(text) {
  const out = {}
  for (const line of String(text ?? '').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    const colon = trimmed.indexOf(':')
    const splitAt = eq >= 0 ? eq : colon
    if (splitAt < 1) continue
    const key = trimmed.slice(0, splitAt).trim()
    const value = trimmed.slice(splitAt + 1).trim()
    if (key) out[key] = value
  }
  return out
}

function serverToDraft(server) {
  return {
    id: server.id,
    label: server.label ?? '',
    serverName: server.serverName ?? '',
    enabled: server.enabled !== false,
    transport: server.transport === 'stdio' ? 'stdio' : 'streamable-http',
    url: server.url ?? '',
    headersText: kvToText(server.headers),
    command: server.command ?? '',
    argsText: Array.isArray(server.args) ? server.args.join('\n') : '',
    envText: kvToText(server.env),
    cwd: server.cwd ?? '',
    toolCallTimeoutMs: server.toolCallTimeoutMs ?? 60000,
    reconnectEnabled: server.reconnect?.enabled !== false,
  }
}

function draftToServer(draft) {
  const serverName = draft.serverName.trim()
  const base = {
    id: draft.id || undefined,
    label: draft.label.trim() || serverName,
    serverName,
    enabled: draft.enabled !== false,
    transport: draft.transport,
    toolCallTimeoutMs: Number(draft.toolCallTimeoutMs) || 60000,
    reconnect: { enabled: draft.reconnectEnabled !== false },
  }
  if (draft.transport === 'stdio') {
    return {
      ...base,
      command: draft.command.trim(),
      args: draft.argsText.split('\n').map((s) => s.trim()).filter(Boolean),
      env: textToKv(draft.envText),
      cwd: draft.cwd.trim(),
    }
  }
  return {
    ...base,
    url: draft.url.trim(),
    headers: textToKv(draft.headersText),
  }
}

function validateDraft(draft) {
  if (!SERVER_NAME_PATTERN.test(draft.serverName.trim())) {
    return 'serverName must match [A-Za-z0-9_-]{1,32}'
  }
  if (draft.transport === 'stdio') {
    if (!draft.command.trim()) return 'stdio requires a command'
  } else if (!draft.url.trim()) {
    return 'HTTP requires a URL'
  } else {
    try {
      const parsed = new URL(draft.url.trim())
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'URL must be http(s)'
    } catch {
      return 'URL is invalid'
    }
  }
  return null
}

async function api(path, init) {
  const response = await fetch(API + path, {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
  const data = await response.json()
  if (!data?.ok) throw new Error(data?.error || `request failed (${response.status})`)
  return data
}

function pill(status) {
  const state = status?.state ?? 'off'
  const label = state === 'connected'
    ? `connected · ${status.toolCount} tools`
    : state === 'connecting'
      ? 'connecting'
      : state === 'error'
        ? 'error'
        : 'disabled'
  const cls = state === 'connected' ? 'on' : state === 'connecting' ? 'wait' : state === 'error' ? 'err' : 'off'
  return h('span', { className: `mcp-pill ${cls}` }, label)
}

function Field({ label, children }) {
  return h('label', { className: 'mcp-field' }, h('span', null, label), children)
}

function ServerForm({ draft, setDraft, onCancel, onSave, busy, error }) {
  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setDraft({ ...draft, [key]: value })
  }
  return h('form', {
    className: 'mcp-form',
    onSubmit: (event) => { event.preventDefault(); onSave() },
  },
    h('div', { className: 'mcp-row' },
      h(Field, { label: 'Label' }, h('input', { value: draft.label, onChange: set('label'), placeholder: 'My MCP server' })),
      h(Field, { label: 'Server name' }, h('input', {
        value: draft.serverName,
        onChange: set('serverName'),
        placeholder: 'my-server',
        required: true,
      })),
    ),
    h(Field, { label: 'Transport' },
      h('select', { value: draft.transport, onChange: set('transport') },
        h('option', { value: 'streamable-http' }, 'Streamable HTTP'),
        h('option', { value: 'stdio' }, 'stdio (local command)'),
      ),
    ),
    draft.transport === 'stdio'
      ? h('div', null,
          h(Field, { label: 'Command' }, h('input', { value: draft.command, onChange: set('command'), placeholder: 'npx' })),
          h(Field, { label: 'Args (one per line)' }, h('textarea', { value: draft.argsText, onChange: set('argsText'), placeholder: '-y\n@modelcontextprotocol/server-github' })),
          h(Field, { label: 'Working directory (optional)' }, h('input', { value: draft.cwd, onChange: set('cwd') })),
          h(Field, { label: 'Env KEY=value (one per line)' }, h('textarea', { value: draft.envText, onChange: set('envText') })),
        )
      : h('div', null,
          h(Field, { label: 'URL' }, h('input', { value: draft.url, onChange: set('url'), placeholder: 'http://127.0.0.1:8399/mcp' })),
          h(Field, { label: 'Headers KEY=value (one per line, static)' }, h('textarea', { value: draft.headersText, onChange: set('headersText'), placeholder: 'Authorization=Bearer …' })),
        ),
    h('div', { className: 'mcp-row' },
      h(Field, { label: 'Tool call timeout (ms)' }, h('input', {
        type: 'number',
        min: 1000,
        value: draft.toolCallTimeoutMs,
        onChange: set('toolCallTimeoutMs'),
      })),
      h('label', { className: 'mcp-check' },
        h('input', { type: 'checkbox', checked: draft.reconnectEnabled, onChange: set('reconnectEnabled') }),
        'Reconnect on drop',
      ),
    ),
    h('label', { className: 'mcp-check' },
      h('input', { type: 'checkbox', checked: draft.enabled, onChange: set('enabled') }),
      'Enabled (mount tools now)',
    ),
    error ? h('p', { className: 'mcp-err' }, error) : null,
    h('div', { className: 'mcp-actions' },
      h('button', { type: 'submit', className: 'mcp-btn', disabled: busy }, busy ? 'Saving…' : 'Save'),
      h('button', { type: 'button', className: 'mcp-btn ghost', onClick: onCancel, disabled: busy }, 'Cancel'),
    ),
  )
}

function McpPage() {
  const [servers, setServers] = useState([])
  const [storePath, setStorePath] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [draft, setDraft] = useState(null)

  const refresh = useCallback(async () => {
    const data = await api('/list')
    setServers(data.servers ?? [])
    setStorePath(data.storePath ?? '')
  }, [])

  useEffect(() => {
    refresh()
      .catch((error) => setMessage(String(error.message || error)))
      .finally(() => setLoading(false))
    const timer = window.setInterval(() => { refresh().catch(() => {}) }, 8000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const run = async (work) => {
    setBusy(true)
    setMessage('')
    try {
      const data = await work()
      if (data?.servers) setServers(data.servers)
      else await refresh()
    } catch (error) {
      setMessage(String(error.message || error))
    } finally {
      setBusy(false)
    }
  }

  const saveDraft = () => {
    const problem = validateDraft(draft)
    if (problem) { setFormError(problem); return }
    setFormError('')
    run(async () => {
      const payload = draftToServer(draft)
      const data = await api('/upsert', { method: 'POST', body: JSON.stringify({ server: payload }) })
      setDraft(null)
      return data
    })
  }

  const intro = useMemo(() => (
    storePath
      ? `Servers are saved to ${storePath}. Tools register as mcp__name__tool. HTTP headers are static — OAuth still needs a local proxy.`
      : 'Connect MCP servers. Tools register as mcp__name__tool.'
  ), [storePath])

  return h('div', { className: 'mcp-page' },
    h('style', null, styles),
    h('div', { className: 'mcp-head' },
      h('div', null,
        h('h2', { className: 'mcp-title' }, h(McpGlyph, { size: 16 }), 'MCP'),
        h('p', { className: 'mcp-intro' }, intro),
      ),
      h('button', {
        className: 'mcp-btn',
        disabled: busy || draft !== null,
        onClick: () => { setFormError(''); setDraft(emptyDraft()) },
      }, 'Add server'),
    ),
    message ? h('div', { className: 'mcp-msg' }, message) : null,
    draft ? h(ServerForm, {
      draft,
      setDraft,
      busy,
      error: formError,
      onCancel: () => setDraft(null),
      onSave: saveDraft,
    }) : null,
    loading && servers.length === 0
      ? h('p', { className: 'mcp-empty' }, 'Loading MCP servers…')
      : servers.length === 0
        ? h('p', { className: 'mcp-empty' }, 'No MCP servers yet. Add a Streamable HTTP URL or a local stdio command.')
        : servers.map((server) => h('article', { className: 'mcp-card', key: server.id },
            h('div', { className: 'mcp-card-top' },
              h('div', { className: 'mcp-name' }, server.label || server.serverName),
              pill(server.status),
            ),
            h('p', { className: 'mcp-meta' },
              `${server.serverName} · ${server.transport}`
              + (server.transport === 'stdio' ? ` · ${server.command}` : ` · ${server.url}`),
            ),
            server.status?.error ? h('p', { className: 'mcp-err' }, server.status.error) : null,
            server.status?.tools?.length
              ? h('p', { className: 'mcp-tools' }, server.status.tools.slice(0, 8).join('  ·  ') + (server.status.toolCount > 8 ? '  …' : ''))
              : null,
            h('div', { className: 'mcp-actions' },
              h('button', {
                className: 'mcp-btn ghost',
                disabled: busy,
                onClick: () => run(() => api('/toggle', {
                  method: 'POST',
                  body: JSON.stringify({ id: server.id, enabled: !server.enabled }),
                })),
              }, server.enabled ? 'Disable' : 'Enable'),
              h('button', {
                className: 'mcp-btn ghost',
                disabled: busy || !server.enabled,
                onClick: () => run(() => api('/reconnect', {
                  method: 'POST',
                  body: JSON.stringify({ id: server.id }),
                })),
              }, 'Reconnect'),
              h('button', {
                className: 'mcp-btn ghost',
                disabled: busy || draft !== null,
                onClick: () => { setFormError(''); setDraft(serverToDraft(server)) },
              }, 'Edit'),
              h('button', {
                className: 'mcp-btn danger',
                disabled: busy,
                onClick: () => {
                  if (!window.confirm(`Delete MCP server “${server.serverName}”? Tools will unregister.`)) return
                  run(() => api('/delete', {
                    method: 'POST',
                    body: JSON.stringify({ id: server.id }),
                  }))
                },
              }, 'Delete'),
            ),
          )),
  )
}

export function apply(ctx) {
  ctx.effect(() => installMcpNavIcon(), 'dsh-mcp-settings: nav icon')
  ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'mcp',
    order: 25,
    label: () => 'MCP',
  }, () => h(McpPage))), 'dsh-mcp-settings: settings page')
}
