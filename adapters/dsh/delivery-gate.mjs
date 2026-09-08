/** Host service boundary: model-supplied prose/booleans are never evidence. */
export async function deliveryCheck(ctx, args = {}, execution) {
  const blocked = (name, detail) => ({ok:false, checks:[{name, pass:false, detail}]})
  const agent = execution?.agent ?? ctx?.get?.('agent')
  if (!agent?.session?.id) return blocked('calling-context', 'UNVERIFIED: an exact calling agent/session is required')
  const gate = ctx?.get?.('harnessGate')
  if (!gate || typeof gate.verifyDelivery !== 'function') {
    return blocked('evidence-producer', 'EVIDENCE_PENDING: configure the harnessGate adapter; self-declared results are not proof')
  }
  try {
    // Only references cross the model boundary. The service loads canonical
    // task, policy, run history and independent reviews for this live caller.
    const result = await gate.verifyDelivery({agent, file:args.file ?? null})
    if (result?.ok !== true || !Array.isArray(result.checks) || !result.checks.length || result.checks.some(c => c.pass !== true)) {
      return result?.ok === false && Array.isArray(result.checks)
        ? result : blocked('gate-contract', 'UNVERIFIED: no complete delivery decision from the host')
    }
    return {ok:true, checks:result.checks}
  } catch {
    return blocked('evidence-validation', 'BLOCKED: evidence validation failed; inspect the redacted host diagnostics')
  }
}
