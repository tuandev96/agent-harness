/** DSH host-plane adapter. Worker tools never accept an identity, authority callback, or review verdict. */
import { Harness } from '../../dist/core/service.js'
import { realpathSync } from 'node:fs'
export const name = '@agent-harness/dsh-host'
export const inject = ['agents', 'tools']

export function createBridge(ctx, harness, root) {
  const workspace = realpathSync(root)
  const bindings = new WeakMap()
  function caller(agent) {
    const agents = ctx.get?.('agents')
    if (!agent || agents?.get?.(agent.id) !== agent || agent.status !== 'running') throw new Error('EXACT_LIVE_AGENT_REQUIRED')
    if (typeof agents.currentInitiator === 'function' && agents.currentInitiator() !== agent) throw new Error('CALLER_CONTEXT_MISMATCH')
    if (!agent.session?.id || !agent.session.header?.cwd || realpathSync(agent.session.header.cwd) !== workspace) throw new Error('WORKSPACE_MISMATCH')
    return { id: String(agent.id), sessionId: String(agent.session.id) }
  }
  function bound(agent) {
    const principal = caller(agent), taskId = bindings.get(agent)
    if (!taskId) throw new Error('TASK_BINDING_REQUIRED')
    const row = harness.get(principal, taskId)
    if (row.definition.authorId !== principal.id || row.definition.sessionId !== principal.sessionId) throw new Error('TASK_AUTHOR_MISMATCH')
    return { principal, taskId }
  }
  return {
    mode: 'ASSISTED',
    // Host operator calls bind; it is intentionally not registered as a worker tool.
    bind(agent, taskId) { const principal = caller(agent); harness.get(principal, taskId); bindings.set(agent, taskId) },
    unbind(agent) { bindings.delete(agent) },
    async verifyDelivery({ agent, file = null }) {
      const { principal, taskId } = bound(agent)
      const assessment = harness.assess(principal, taskId)
      const checks = [{ name: 'current-acceptance', pass: assessment.gateReady, detail: assessment.reasonCodes.join(', ') || 'All target criteria have current accepted observations (ASSISTED)' }]
      if (file !== null) {
        const records = harness.export(principal, taskId).records.filter(r => r.kind === 'run')
        const matched = records.some(r => r.value.finishedCandidate === assessment.candidateDigest && r.value.artifacts.some(a => a.path === file))
        checks.push({ name: 'delivery-artifact', pass: matched, detail: matched ? 'Artifact linked to current execution' : 'Artifact has no current run reference; use a project-relative path' })
      }
      return { ok: checks.every(c => c.pass), checks }
    },
    async run(agent, bindingId) { const { principal, taskId } = bound(agent); return harness.run(principal, taskId, bindingId) },
    status(agent) { const { principal, taskId } = bound(agent); return harness.assess(principal, taskId) },
    cancel(agent) { const { principal, taskId } = bound(agent); return harness.cancel(principal, taskId) },
    complete(agent) { const { principal, taskId } = bound(agent); return harness.complete(principal, taskId) },
  }
}

export function apply(ctx, config) {
  // Authorization is supplied by the trusted host integration, not serialized config from an LLM.
  const authority = ctx.get?.('harnessAuthority')
  if (!authority || typeof authority.authorize !== 'function') throw new Error('HOST_AUTHORITY_REQUIRED')
  const harness = new Harness({ root: config.root, projectId: config.projectId, database: config.database,
    authorize: (principal, action, subject) => authority.authorize(principal, action, subject) === true })
  const bridge = createBridge(ctx, harness, config.root)
  ctx.provide('harnessGate', bridge)
  ctx.provide('harnessControl', { harness, bind: bridge.bind, unbind: bridge.unbind })
  const jsonOutput = { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] }
  for (const [toolName, properties, required, execute] of [
    ['harness_status', {}, [], (_args, agent) => bridge.status(agent)],
    ['harness_run', { bindingId: { type: 'string', minLength: 1 } }, ['bindingId'], (args, agent) => bridge.run(agent, args.bindingId)],
    ['harness_cancel', {}, [], (_args, agent) => bridge.cancel(agent)],
  ]) ctx.effect(() => ctx.tools.register({ name: toolName, description: 'Operate only the host-bound task. No task or identity guessing.',
    parameters: { type: 'object', properties, required, additionalProperties: false }, output: jsonOutput,
    execute: async (args, execution) => JSON.stringify(await execute(args, execution?.agent)) }))
  ctx.effect(() => () => harness.close(), 'harness: close persistent store after active calls settle')
}
