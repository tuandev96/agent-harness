import { existsSync, readFileSync, mkdirSync, realpathSync, lstatSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { userInfo } from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import { Harness } from '../core/service.js';
import { Store } from '../core/store.js';
import { safePath } from '../core/files.js';
import type { Principal } from '../core/types.js';

export interface Options { root?: string; project?: string; file?: string; task?: string; binding?: string; apply?: boolean }
interface Configuration { contract: string; projectId: string; root: string; ownerId: string; sessionId: string; mode: 'ASSISTED' }
export function parseOptions(argv: string[]): { command: string; options: Options } {
  const [command = 'help', ...args] = argv, options: Record<string, string | boolean> = {};
  const allowed = new Set(['root', 'project', 'file', 'task', 'binding', 'apply']);
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]!;
    if (!flag.startsWith('--') || !allowed.has(flag.slice(2)) || Object.hasOwn(options, flag.slice(2))) throw new Error('UNKNOWN_OR_DUPLICATE_OPTION');
    const key = flag.slice(2);
    if (key === 'apply') options[key] = true;
    else { const value = args[++i]; if (!value || value.startsWith('--')) throw new Error('OPTION_VALUE_REQUIRED'); options[key] = value; }
  }
  return { command, options };
}
export function operatorId(): string {
  const user = userInfo();
  return 'local-' + createHash('sha256').update(`${user.username}|${user.uid}`).digest('hex').slice(0, 20);
}
export const resolveRoot = (options: Options): string => realpathSync(resolve(options.root ?? process.cwd()));
export function initialize(options: Options): unknown {
  const root = resolveRoot(options), home = join(root, '.harness'), path = join(home, 'project.json');
  if (!options.project || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(options.project)) throw new Error('PROJECT_ID_REQUIRED');
  if (existsSync(home) && lstatSync(home).isSymbolicLink()) throw new Error('PROJECT_STATE_SYMLINK');
  if (existsSync(path)) throw new Error('ALREADY_INITIALIZED: existing policy and history were not replaced');
  if (!options.apply) return { dryRun: true, destination: path, projectId: options.project, ownerId: operatorId() };
  const config: Configuration = { contract: 'harness-local-project/1', projectId: options.project, root, ownerId: operatorId(), sessionId: randomUUID(), mode: 'ASSISTED' };
  mkdirSync(home, { recursive: true, mode: 0o700 });
  const database = join(home, 'state.sqlite');
  if (existsSync(database)) throw new Error('EXISTING_STATE_WITHOUT_CONFIG: recover explicitly');
  const store = new Store(database); store.close();
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return { initialized: true, ...config };
}
export function project(options: Options): { root: string; caller: Principal; configuration: Configuration; open: () => Harness } {
  const root = resolveRoot(options), config = JSON.parse(readFileSync(safePath(root, '.harness/project.json'), 'utf8')) as Configuration;
  if (config.contract !== 'harness-local-project/1' || config.root !== root || config.ownerId !== operatorId() || config.mode !== 'ASSISTED' || !config.sessionId) throw new Error('PROJECT_POLICY_MISMATCH');
  const database = safePath(root, '.harness/state.sqlite');
  const caller = { id: config.ownerId, sessionId: config.sessionId };
  return { root, caller, configuration: config,
    open: () => new Harness({ root, projectId: config.projectId, database,
      authorize: (principal, action, subject) => principal.id === caller.id && principal.sessionId === caller.sessionId && subject.projectId === config.projectId && action !== 'review' }) };
}
export function readInput(root: string, options: Options): { path: string; text: string; sha256: string } {
  if (!options.file) throw new Error('FILE_OPTION_REQUIRED');
  const bytes = readFileSync(safePath(root, options.file));
  if (bytes.length > 4 * 1024 * 1024) throw new Error('INPUT_SIZE_LIMIT');
  return { path: options.file, text: bytes.toString('utf8'), sha256: createHash('sha256').update(bytes).digest('hex') };
}
