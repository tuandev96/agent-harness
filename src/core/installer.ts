import { existsSync, readFileSync, readdirSync, lstatSync, mkdirSync, openSync, writeFileSync, closeSync, unlinkSync, realpathSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomicWrite, sha256, safePath } from './files.js';

const START = '<!-- AGENT-HARNESS:START -->', END = '<!-- AGENT-HARNESS:END -->';
interface Entry { path: string; before: string | null; after: string; beforeHash: string | null; afterHash: string; conflict: boolean }
export interface InstallPlan { contract: 'harness-install/1'; id: string; target: string; entries: Entry[]; sourceVersion: string }
interface Receipt extends InstallPlan { status: 'PREPARED' | 'COMPLETED' | 'ROLLED_BACK' }
function targetPath(root: string, path: string): string {
  if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('UNSAFE_INSTALL_PATH');
  let current = root;
  for (const part of path.split('/')) { current = join(current, part); if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error('INSTALL_SYMLINK'); }
  return current;
}
const currentBytes = (path: string): Buffer | null => existsSync(path) ? readFileSync(path) : null;
function portableFiles(root: string, prefix: string): string[] {
  return readdirSync(safePath(root, prefix), { withFileTypes: true }).flatMap(entry => {
    if (['__pycache__', 'node_modules', '.DS_Store'].includes(entry.name)) return [];
    if (entry.isSymbolicLink()) throw new Error('SOURCE_SYMLINK');
    const path = prefix + '/' + entry.name;
    return entry.isDirectory() ? portableFiles(root, path) : /\.(?:md|json|py|sh|yml)$/.test(path) ? [path] : [];
  });
}
function receipts(root: string): Receipt[] {
  const path = targetPath(root, '.harness-installations');
  if (!existsSync(path)) return [];
  return readdirSync(path).filter(name => /^[a-f0-9-]+\.json$/.test(name)).map(name => {
    const value = JSON.parse(readFileSync(targetPath(root, '.harness-installations/' + name), 'utf8')) as Receipt;
    if (value.contract !== 'harness-install/1' || value.target !== root || !Array.isArray(value.entries)) throw new Error('INSTALL_RECEIPT_INVALID');
    return value;
  });
}
export function planInstall(source: string, destination: string): InstallPlan {
  const root = realpathSync(source), target = realpathSync(destination);
  if (root === target) throw new Error('SOURCE_IS_NOT_INSTALL_TARGET');
  const sourceVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version as string;
  const files = ['protocol/harness-protocol.md', ...portableFiles(root, 'templates'), ...portableFiles(root, 'skills/requirements-spec')].sort();
  const history = receipts(target).filter(r => r.status === 'COMPLETED');
  const entries: Entry[] = files.map(file => {
    const path = file === 'protocol/harness-protocol.md' ? 'rules/harness-protocol.md' : file;
    const data = readFileSync(safePath(root, file)), before = currentBytes(targetPath(target, path));
    const beforeHash = before ? sha256(before) : null, afterHash = sha256(data);
    const owned = history.some(r => r.entries.some(e => e.path === path && e.afterHash === beforeHash));
    return { path, before: before?.toString('base64') ?? null, after: data.toString('base64'), beforeHash, afterHash,
      conflict: beforeHash !== null && beforeHash !== afterHash && !owned };
  });
  const path = 'AGENTS.md', before = currentBytes(targetPath(target, path)), text = before?.toString('utf8') ?? '';
  const starts = text.split(START).length - 1, ends = text.split(END).length - 1;
  if (starts !== ends || starts > 1 || starts === 1 && text.indexOf(START) > text.indexOf(END)) throw new Error('MANAGED_BLOCK_MALFORMED');
  const block = `${START}\nRead \`${join(target, 'rules/harness-protocol.md')}\` before task work. Load \`${join(target, 'skills/requirements-spec/SKILL.md')}\` only for relevant requirements/tracking tasks.\n${END}`;
  const updated = starts ? text.slice(0, text.indexOf(START)) + block + text.slice(text.indexOf(END) + END.length) : text + (text && !text.endsWith('\n') ? '\n' : '') + '\n' + block + '\n';
  const data = Buffer.from(updated);
  const existingBlock = starts ? text.slice(text.indexOf(START), text.indexOf(END) + END.length) : null;
  const ownedBlock = history.some(receipt => receipt.entries.some(entry => {
    if (entry.path !== 'AGENTS.md') return false;
    const previous = Buffer.from(entry.after, 'base64').toString('utf8');
    return previous.includes(START) && previous.slice(previous.indexOf(START), previous.indexOf(END) + END.length) === existingBlock;
  }));
  const conflict = existingBlock !== null && existingBlock !== block && !ownedBlock;
  entries.push({ path, before: before?.toString('base64') ?? null, after: data.toString('base64'), beforeHash: before ? sha256(before) : null, afterHash: sha256(data), conflict });
  return { contract: 'harness-install/1', id: randomUUID(), target, entries, sourceVersion };
}
function lock(root: string): () => void {
  const path = targetPath(root, '.harness-install.lock'), fd = openSync(path, 'wx', 0o600);
  writeFileSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() })); closeSync(fd);
  return () => { if (existsSync(path)) unlinkSync(path); };
}
export function install(plan: InstallPlan, options: { afterWrite?: (path: string) => void } = {}): { receipt: string; changed: number } {
  if (plan.contract !== 'harness-install/1' || realpathSync(plan.target) !== plan.target || !/^[a-f0-9-]+$/.test(plan.id)) throw new Error('INVALID_INSTALL_PLAN');
  if (plan.entries.some(e => e.conflict)) throw new Error('USER_CHANGES_CONFLICT');
  const release = lock(plan.target), receipt = targetPath(plan.target, '.harness-installations/' + plan.id + '.json');
  try {
    for (const entry of plan.entries) {
      const current = currentBytes(targetPath(plan.target, entry.path));
      if ((current ? sha256(current) : null) !== entry.beforeHash || sha256(Buffer.from(entry.after, 'base64')) !== entry.afterHash) throw new Error('STALE_INSTALL_PLAN');
    }
    const record: Receipt = { ...plan, status: 'PREPARED' }; atomicWrite(receipt, JSON.stringify(record, null, 2));
    let changed = 0;
    for (const entry of plan.entries) {
      const path = targetPath(plan.target, entry.path), current = currentBytes(path);
      if ((current ? sha256(current) : null) !== entry.beforeHash) throw new Error('TARGET_CHANGED_DURING_INSTALL');
      if (entry.beforeHash !== entry.afterHash) { atomicWrite(path, Buffer.from(entry.after, 'base64')); changed++; options.afterWrite?.(entry.path); }
    }
    record.status = 'COMPLETED'; atomicWrite(receipt, JSON.stringify(record, null, 2)); return { receipt, changed };
  } finally { release(); }
}
export function rollback(destination: string, receiptId: string): { restored: number } {
  const root = realpathSync(destination);
  if (!/^[a-f0-9-]+$/.test(receiptId)) throw new Error('INVALID_RECEIPT_ID');
  const path = targetPath(root, '.harness-installations/' + receiptId + '.json');
  const record = JSON.parse(readFileSync(path, 'utf8')) as Receipt;
  if (record.contract !== 'harness-install/1' || record.target !== root || !['PREPARED', 'COMPLETED'].includes(record.status)) throw new Error('INVALID_ROLLBACK_RECEIPT');
  const release = lock(root);
  try {
    for (const entry of record.entries) {
      const bytes = currentBytes(targetPath(root, entry.path)), hash = bytes ? sha256(bytes) : null;
      if (hash !== entry.afterHash && !(record.status === 'PREPARED' && hash === entry.beforeHash)) throw new Error('ROLLBACK_WOULD_OVERWRITE_USER_CHANGES');
      if (entry.before !== null && sha256(Buffer.from(entry.before, 'base64')) !== entry.beforeHash) throw new Error('BACKUP_HASH_MISMATCH');
    }
    let restored = 0;
    for (const entry of [...record.entries].reverse()) {
      const path = targetPath(root, entry.path), bytes = currentBytes(path);
      if ((bytes ? sha256(bytes) : null) === entry.beforeHash) continue;
      if (entry.before === null) unlinkSync(path); else atomicWrite(path, Buffer.from(entry.before, 'base64'));
      restored++;
    }
    record.status = 'ROLLED_BACK'; atomicWrite(path, JSON.stringify(record, null, 2)); return { restored };
  } finally { release(); }
}
