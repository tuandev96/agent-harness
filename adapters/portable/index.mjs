/** Capability disclosure is data, not a claim that native enforcement has been installed. */
export const runtimes = Object.freeze(['claude-code','codex','grok','cursor','dsh'])
export function capabilities(runtime, observations = []) {
  if (!runtimes.includes(runtime)) throw new Error('UNSUPPORTED_RUNTIME')
  return {
    runtime, protocol: 'protocol/harness-protocol.md',
    skills: {
      captureIntent: 'skills/capture-intent/SKILL.md',
      requirementsSpec: 'skills/requirements-spec/SKILL.md',
      planMode: 'skills/plan-mode/SKILL.md',
      reviewPolicy: 'skills/review-policy/SKILL.md',
    },
    hooksPack: 'hooks/',
    mode: 'ASSISTED', nativePermissions: 'OWNED_BY_HOST_NOT_OVERRIDDEN',
    workerIdentity: runtime === 'dsh' ? 'HOST_REGISTRY_BINDING' : 'NATIVE_ADAPTER_REQUIRED',
    codeAvailable: runtime === 'dsh' ? ['delivery bridge','exact-caller binding','recorder tools'] : ['portable protocol','artifact-chain skills','review policy','reference hooks','local CLI'],
    observations: observations.filter(o => o.runtime === runtime && typeof o.evidencePath === 'string').map(o => ({...o,claim:'OBSERVATION_NOT_ENFORCEMENT_ATTESTATION'})),
    nativeConformanceVerified: false,
  }
}
/** Never turn a tool/search/memory payload into permissions. */
export function contextualData(kind, payload) {
  if (!['tool','memory','web','spec','report'].includes(kind)) throw new Error('UNKNOWN_CONTEXT_KIND')
  return JSON.stringify({kind,trust:'UNTRUSTED_DATA',grantsPermissions:false,payload})
}
