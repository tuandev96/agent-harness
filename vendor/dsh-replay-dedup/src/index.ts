/**
 * Rate-limit llm-pi-ai "unusable replay state" warnings.
 * Host logs one line per history message per request (quadratic). Wrapping
 * logger exporters drops repeats of the same route/reason for 60s.
 */
import type { Context } from 'cordis'
import z from 'schemastery'

export const name = '@dsh-external/dsh-replay-dedup'
export const inject = []

export const Config = z.object({
  windowMs: z.number().default(60_000),
})
export type Config = z.infer<typeof Config>

function isReplayWarn(message: { type?: string, args?: unknown[] }): boolean {
  if (message?.type !== 'warn') return false
  const first = message.args?.[0]
  return typeof first === 'string' && first.includes('unusable replay state')
}

export function apply(ctx: Context, config: Config): void {
  const windowMs = config.windowMs ?? 60_000
  const lastAt = new Map<string, number>()
  const drop = (message: { type?: string, args?: unknown[] }) => {
    if (!isReplayWarn(message)) return false
    const key = String(message.args?.[0] ?? '')
    const now = Date.now()
    const prev = lastAt.get(key) ?? 0
    if (now - prev < windowMs) return true
    lastAt.set(key, now)
    return false
  }
  const wrap = (exporter: { export: (m: unknown) => void, __dshReplayWrap?: boolean }) => {
    if (!exporter || exporter.__dshReplayWrap) return
    const inner = exporter.export.bind(exporter)
    exporter.export = (message: { type?: string, args?: unknown[] }) => {
      if (drop(message)) return
      inner(message)
    }
    exporter.__dshReplayWrap = true
  }

  const service = ctx.logger as unknown as { exporters?: Map<number, { export: (m: unknown) => void }>, exporter: (e: unknown) => () => void }
  for (const exporter of service.exporters?.values() ?? []) wrap(exporter)
  const orig = service.exporter.bind(service)
  service.exporter = (exporter: { export: (m: unknown) => void }) => {
    wrap(exporter)
    return orig(exporter)
  }
  ctx.effect(() => () => {
    service.exporter = orig
  }, '@dsh-external/dsh-replay-dedup: unwrap exporter()')
}
