/** Log-noise suppression only. This does not deduplicate tool execution. */
const installations = new WeakMap()

export function installReplayDedup(service, { windowMs = 60000, maxKeys = 1024, now = () => performance.now() } = {}) {
  if (!Number.isFinite(windowMs) || windowMs <= 0 || !Number.isInteger(maxKeys) || maxKeys < 1) throw new Error('invalid dedup limits')
  if (!service || typeof service.exporter !== 'function') throw new Error('logger exporter service unavailable')
  const previous = installations.get(service)
  if (previous) { previous.refs++; return lease(service, previous) }
  const state = { refs: 1, active: true, wrappers: new Map(), originalRegister: service.exporter, register: null }
  const unwrap = exporter => {
    const owned = state.wrappers.get(exporter)
    if (!owned) return
    if (exporter.export === owned.wrapper) exporter.export = owned.original
    owned.last.clear()
    owned.active = false
    state.wrappers.delete(exporter)
  }
  const wrap = exporter => {
    if (!state.active || !exporter || typeof exporter.export !== 'function' || state.wrappers.has(exporter)) return
    const owned = { original: exporter.export, wrapper: null, last: new Map(), active: true }
    owned.wrapper = function(message) {
      const first = message?.args?.[0]
      if (state.active && owned.active && message?.type === 'warn' && typeof first === 'string' && first.includes('unusable replay state')) {
        let key
        try { key = JSON.stringify(message.args) } catch { key = first }
        const time = now(), prior = owned.last.get(key)
        if (prior !== undefined && time - prior < windowMs) return
        for (const [k, at] of owned.last) if (time - at >= windowMs) owned.last.delete(k)
        owned.last.delete(key); owned.last.set(key, time)
        while (owned.last.size > maxKeys) owned.last.delete(owned.last.keys().next().value)
      }
      return owned.original.call(exporter, message)
    }
    exporter.export = owned.wrapper
    state.wrappers.set(exporter, owned)
  }
  for (const exporter of service.exporters?.values() ?? []) wrap(exporter)
  state.register = function(exporter) {
    wrap(exporter)
    const dispose = state.originalRegister.call(service, exporter)
    return () => { unwrap(exporter); if (typeof dispose === 'function') dispose() }
  }
  service.exporter = state.register
  state.dispose = () => {
    state.active = false
    if (service.exporter === state.register) service.exporter = state.originalRegister
    for (const exporter of [...state.wrappers.keys()]) unwrap(exporter)
    installations.delete(service)
  }
  installations.set(service, state)
  return lease(service, state)
}
function lease(service, state) {
  let released = false
  return () => { if (!released) { released = true; release(service, state) } }
}
function release(service, state) {
  if (state.active && --state.refs === 0) state.dispose()
}
export function apply(ctx, config = {}) {
  const dispose = installReplayDedup(ctx.logger, config)
  ctx.effect(() => dispose, 'dsh-replay-dedup: owned exporter lifecycle')
}
