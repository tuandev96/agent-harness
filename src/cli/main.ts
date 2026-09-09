import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { safePath, redact } from '../core/files.js';
import { initialize, parseOptions, project, readInput, resolveRoot } from './project.js';

const print = (value: unknown): void => { console.log(JSON.stringify(value, null, 2)); };
export async function main(argv: string[]): Promise<void> {
  const { command, options } = parseOptions(argv);
  if (command === 'help') {
    print({ commands: ['doctor', 'init --project ID [--apply]', 'identity', 'create --file task.json', 'revise --task ID --file task.json',
      'run --task ID --binding ID', 'status --task ID', 'complete --task ID', 'cancel --task ID', 'recover --task ID', 'export --task ID', 'migrate --task ID --file legacy.json'],
      mode: 'ASSISTED', review: 'Independent review is host-owned. This CLI cannot manufacture a reviewer identity.' }); return;
  }
  if (command === 'doctor') {
    const root = resolveRoot(options), repo = fileURLToPath(new URL('../../', import.meta.url));
    const manifestPath = join(repo, 'dist/build-manifest.json');
    let current = false;
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { files: { source: string; output: string; sourceSha256: string; outputSha256: string }[] };
      current = manifest.files.length > 0 && manifest.files.every(file => {
        try { return createHash('sha256').update(readFileSync(safePath(repo, file.source))).digest('hex') === file.sourceSha256 &&
          createHash('sha256').update(readFileSync(safePath(repo, file.output))).digest('hex') === file.outputSha256; } catch { return false; }
      });
    }
    const supported = Number(process.versions.node.split('.')[0]) >= 24;
    print({ runtime: process.version, runtimeSupported: supported, buildCurrent: current, projectInitialized: existsSync(join(root, '.harness/project.json')),
      trust: 'ASSISTED', nativePermissionEnforced: false, independentReview: 'HOST_INTEGRATION_REQUIRED', releaseReady: false });
    if (!supported || !current) process.exitCode = 1; return;
  }
  if (command === 'init') { print(initialize(options)); return; }
  const local = project(options), caller = local.caller;
  if (command === 'identity') { print({ caller, projectId: local.configuration.projectId, mode: 'ASSISTED' }); return; }
  const harness = local.open();
  try {
    if (command === 'create') { print(harness.create(caller, JSON.parse(readInput(local.root, options).text))); return; }
    if (!options.task) throw new Error('TASK_OPTION_REQUIRED');
    const taskId = options.task;
    if (command === 'revise') { print(harness.revise(caller, taskId, JSON.parse(readInput(local.root, options).text))); return; }
    if (command === 'run') {
      if (!options.binding) throw new Error('BINDING_OPTION_REQUIRED');
      const cancel = (): void => { try { harness.cancel(caller, taskId); } catch { /* state remains inspectable */ } };
      process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
      try { const result = await harness.run(caller, taskId, options.binding); print(result); if (result.outcome !== 'PASS') process.exitCode = 1; }
      finally { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); } return;
    }
    if (command === 'status') { const result = harness.assess(caller, taskId); print(result); if (!result.gateReady) process.exitCode = 2; return; }
    if (command === 'complete') { print(harness.complete(caller, taskId)); return; }
    if (command === 'cancel') { print(harness.cancel(caller, taskId)); return; }
    if (command === 'recover') { print(harness.recover(caller, taskId)); return; }
    if (command === 'export') { print(harness.export(caller, taskId)); return; }
    if (command === 'migrate') {
      const input = readInput(local.root, options);
      if (redact(input.text) !== input.text) throw new Error('SECRET_LIKE_LEGACY_INPUT_REJECTED');
      const imported = harness.importLegacy(caller, taskId, { path: input.path, sha256: input.sha256, raw: input.text, parsed: JSON.parse(input.text) });
      print({ id: imported.id, assessment: imported.assessment, sourceHash: input.sha256 }); return;
    }
    throw new Error('UNKNOWN_COMMAND');
  } finally { harness.close(); }
}
