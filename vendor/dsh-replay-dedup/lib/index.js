import z from 'schemastery';
export const name = '@dsh-external/dsh-replay-dedup';
export const inject = [];
export const Config = z.object({
    windowMs: z.number().default(60_000),
});
function isReplayWarn(message) {
    if (message?.type !== 'warn')
        return false;
    const first = message.args?.[0];
    return typeof first === 'string' && first.includes('unusable replay state');
}
export function apply(ctx, config) {
    const windowMs = config.windowMs ?? 60_000;
    const lastAt = new Map();
    const drop = (message) => {
        if (!isReplayWarn(message))
            return false;
        const key = String(message.args?.[0] ?? '');
        const now = Date.now();
        const prev = lastAt.get(key) ?? 0;
        if (now - prev < windowMs)
            return true;
        lastAt.set(key, now);
        return false;
    };
    const wrap = (exporter) => {
        if (!exporter || exporter.__dshReplayWrap)
            return;
        const inner = exporter.export.bind(exporter);
        exporter.export = (message) => {
            if (drop(message))
                return;
            inner(message);
        };
        exporter.__dshReplayWrap = true;
    };
    const service = ctx.logger;
    for (const exporter of service.exporters?.values() ?? [])
        wrap(exporter);
    const orig = service.exporter.bind(service);
    service.exporter = (exporter) => {
        wrap(exporter);
        return orig(exporter);
    };
    ctx.effect(() => () => {
        service.exporter = orig;
    }, '@dsh-external/dsh-replay-dedup: unwrap exporter()');
}
//# sourceMappingURL=index.js.map