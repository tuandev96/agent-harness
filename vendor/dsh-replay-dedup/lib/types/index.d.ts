/**
 * Rate-limit llm-pi-ai "unusable replay state" warnings.
 * Host logs one line per history message per request (quadratic). Wrapping
 * logger exporters drops repeats of the same route/reason for 60s.
 */
import type { Context } from 'cordis';
import z from 'schemastery';
export declare const name = "@dsh-external/dsh-replay-dedup";
export declare const inject: never[];
export declare const Config: any;
export type Config = z.infer<typeof Config>;
export declare function apply(ctx: Context, config: Config): void;
