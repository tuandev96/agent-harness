import z from 'schemastery'
export const name = '@dsh-external/dsh-replay-dedup'
export const inject = []
export const Config = z.object({ windowMs: z.number().default(60000) })
export type Config = z.infer<typeof Config>
export { apply } from './runtime.js'
