/**
 * Host-plane glob/grep argument coerce + INVALID_ARGS echo.
 *
 * Gemini Flash (native invoke, cliproxy openai-completions) sometimes emits
 * `{ description: "pattern: globstar/*.ts" }` because bash/run_code own
 * `description` and tools_help used to print a `描述:` heading above `pattern:`.
 * Validator then throws missing required property "pattern" with no
 * received-keys hint, and the model loops.
 *
 * pre-execute mutates exec.arguments (deepFrozen value → replace the field)
 * before defineTool.validate. post-execute rewrites error text if still INVALID_ARGS.
 *
 * @module dsh-tool-arg-coerce
 */
export const name = 'dsh-tool-arg-coerce'
export const inject = ['tools']

const SEARCH_PATTERN_TOOLS = new Set(['glob', 'grep'])

export function extractMiskeyedPattern(desc) {
  if (typeof desc !== 'string') return null
  const trimmed = desc.trim()
  if (!trimmed) return null
  const prefixed = trimmed.match(/^pattern:\s*([\s\S]+)$/i)
  if (prefixed) return prefixed[1].trim() || null
  if (trimmed.length <= 200 && /[*?]|\[.+\]|\{.+\}|\*\*/.test(trimmed)) return trimmed
  if (trimmed.length <= 200 && /[\\^$|()]/.test(trimmed) && !/\s/.test(trimmed)) return trimmed
  return null
}

export function coerceSearchToolArgs(toolName, args) {
  if (!SEARCH_PATTERN_TOOLS.has(toolName)) return { args, coerced: false }
  if (!args || typeof args !== 'object' || Array.isArray(args)) return { args, coerced: false }
  if (typeof args.pattern === 'string' && args.pattern.length > 0) return { args, coerced: false }
  const extracted = extractMiskeyedPattern(args.description)
  if (!extracted) return { args, coerced: false }
  const next = { ...args, pattern: extracted }
  delete next.description
  return { args: next, coerced: true, from: 'description' }
}

function receivedKeys(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return []
  return Object.keys(args)
}

function enrichMessage(exec, result) {
  if (!result?.isError) return null
  const raw = String(result.error?.message || '')
  const body = Array.isArray(result.content) ? result.content.map((b) => b?.text || '').join('\n') : ''
  const msg = raw || body
  if (!/missing required property|invalid arguments/i.test(msg)) return null
  const keys = receivedKeys(exec?.arguments)
  const bits = [msg.replace(/^Error:\s*/i, '').replace(/^invalid arguments:\s*/i, '')]
  if (!/received keys:/.test(msg)) bits.push('received keys: ' + (keys.length ? keys.join(', ') : '(none)'))
  if (SEARCH_PATTERN_TOOLS.has(exec?.name) && keys.includes('description') && !keys.includes('pattern')) {
    bits.push('unknown key "description" (' + exec.name + ' required string is "pattern" — pass pattern: "<glob or regex>"; description is bash/run_code)')
  }
  return 'Error: invalid arguments: ' + bits.join('; ')
}

export function apply(ctx) {
  const streak = new Map()
  ctx.on('tools/pre-execute', (exec, next) => {
    try {
      const coerced = coerceSearchToolArgs(exec?.name, exec?.arguments)
      if (coerced.coerced) exec.arguments = coerced.args
    } catch { /* never block dispatch */ }
    return next()
  }, { prepend: true })
  ctx.on('tools/post-execute', async (exec, result, next) => {
    const downstream = await next()
    if (downstream.kind === 'accept' && !result?.isError) {
      const sid = exec?.agent?.session?.id
      if (sid) streak.delete(sid)
      return downstream
    }
    const text = enrichMessage(exec, downstream.kind === 'block'
      ? { isError: true, error: { message: (downstream.feedback || []).map((b) => b.text || '').join('\n') }, content: downstream.feedback }
      : result)
    if (!text) return downstream
    const key = (exec?.agent?.session?.id || 'anon') + ':' + (exec?.name || '')
    const n = (streak.get(key) || 0) + 1
    streak.set(key, n)
    let out = text
    if (n >= 2 && SEARCH_PATTERN_TOOLS.has(exec?.name)) {
      out += '\nHint: glob/grep required string is name=pattern. Do not pass description. Example: glob({ pattern: "**/*.ts", path: "." })'
    }
    const content = [{ type: 'text', text: out }]
    if (downstream.kind === 'block') return { ...downstream, feedback: content }
    return { ...downstream, content, kind: downstream.kind || 'accept' }
  })
}
