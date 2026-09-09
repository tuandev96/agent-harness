import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { safePath, sha256 } from './files.js';
import type { TaskDefinition } from './types.js';

export interface Catalog {
  contract: 'requirements-catalog/1'; valid: boolean; semanticApproval: false;
  sourceSha256: string; requirementIds: string[];
  criteria: { id: string; requirementId: string | null; kind: 'AC' | 'NFR' }[];
  warnings: { id: string; line: number; message: string }[];
}
const validator = fileURLToPath(new URL('../../skills/requirements-spec/scripts/validate_spec.py', import.meta.url));
/** Uses the same authoring validator. Inventory validation does not approve the scope or oracle. */
export function readCatalog(root: string, path: string): Catalog {
  const source = safePath(root, path), before = sha256(readFileSync(source));
  const result = spawnSync('python3', ['-I', '-B', validator, source, '--catalog-json'], {
    cwd: root, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, timeout: 30000,
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot },
  });
  if (result.error || result.status !== 0) throw new Error('SRS_VALIDATION_FAILED');
  let catalog: Catalog;
  try { catalog = JSON.parse(result.stdout) as Catalog; } catch { throw new Error('CATALOG_OUTPUT_INVALID'); }
  if (catalog.contract !== 'requirements-catalog/1' || catalog.valid !== true || catalog.semanticApproval !== false ||
      catalog.sourceSha256 !== before || sha256(readFileSync(source)) !== before || !Array.isArray(catalog.criteria) ||
      !Array.isArray(catalog.requirementIds) || !Array.isArray(catalog.warnings)) throw new Error('CATALOG_IDENTITY_MISMATCH');
  return catalog;
}
export function validateBaseline(root: string, task: TaskDefinition): void {
  if (!task.baseline) return;
  if (!task.inputPaths.includes(task.baseline.path)) throw new Error('BASELINE_INPUT_NOT_PINNED');
  const catalog = readCatalog(root, task.baseline.path);
  if (catalog.sourceSha256 !== task.baseline.sha256) throw new Error('BASELINE_CHANGED');
  const same = (a: string[], b: string[]) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
  if (!same(task.requirementIds, catalog.requirementIds) || !same(task.criteria.map(c => c.id), catalog.criteria.map(c => c.id))) throw new Error('SRS_INVENTORY_MISMATCH');
  if (task.criteria.some(c => catalog.criteria.find(row => row.id === c.id)?.requirementId !== c.requirementId)) throw new Error('SRS_PARENT_MISMATCH');
  const dispositions = task.baseline.warningDispositions;
  if (new Set(dispositions.map(d => d.id)).size !== dispositions.length ||
      !same(dispositions.map(d => d.id), catalog.warnings.map(w => w.id)) || dispositions.some(d => !d.reason.trim())) throw new Error('WARNING_DISPOSITION_REQUIRED');
}
