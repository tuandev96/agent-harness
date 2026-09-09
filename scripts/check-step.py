#!/usr/bin/env python3
"""Run one bounded verification step and persist its real process outcome.

This is local checker execution, not an independent acceptance service.
"""
from pathlib import Path
import datetime
import hashlib
import json
import os
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / 'plans/260908-2104-harness-comprehensive-upgrade/reports'
COMMANDS = {'typecheck': ['node', 'scripts/typecheck.mjs'],
            'package': ['node', 'scripts/package.mjs', '--check']}
for group in ['core', 'plugins', 'operations', 'regression', 'spec', 'legacy']:
    COMMANDS[group] = ['node', 'scripts/test.mjs', '--suite', group]


def fingerprint():
    entries = []
    for name in ['src', 'scripts', 'tests', 'adapters', 'contracts', 'vendor', '.agent-presets', 'skills', 'protocol', 'evals']:
        directory = ROOT / name
        if not directory.exists():
            continue
        for path in sorted(directory.rglob('*')):
            parts = path.relative_to(ROOT).parts
            if any(part in ['node_modules', '__pycache__', '.git'] for part in parts):
                continue
            if path.is_symlink():
                raise ValueError('SYMLINK_IN_VERIFICATION_INPUT')
            if path.is_file() and path.suffix not in ['.pyc', '.log']:
                entries.append([path.relative_to(ROOT).as_posix(), hashlib.sha256(path.read_bytes()).hexdigest()])
    for name in ['package.json', 'package-lock.json', 'tsconfig.json']:
        path = ROOT / name
        if path.is_file():
            entries.append([name, hashlib.sha256(path.read_bytes()).hexdigest()])
    return hashlib.sha256(json.dumps(sorted(entries)).encode()).hexdigest()


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in COMMANDS:
        raise ValueError('Usage: check-step.py ' + '|'.join(COMMANDS))
    name = sys.argv[1]
    REPORTS.mkdir(parents=True, exist_ok=True)
    before = fingerprint()
    start = time.monotonic()
    log_path = REPORTS / ('current-' + name + '.log')
    with log_path.open('wb') as handle:
        os.chmod(log_path, 0o600)
        proc = subprocess.Popen(COMMANDS[name], cwd=ROOT, stdout=handle, stderr=subprocess.STDOUT,
                                start_new_session=True, env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'})
        timed_out = False
        try:
            code = proc.wait(timeout=46)
        except subprocess.TimeoutExpired:
            timed_out = True
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            code = proc.wait(timeout=3)
    after = fingerprint()
    result = {'kind': 'BOUNDED_LOCAL_CHECK', 'name': name, 'argv': COMMANDS[name],
              'recordedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'inputDigest': before, 'inputsUnchanged': before == after,
              'exitCode': code, 'timedOut': timed_out,
              'outcome': 'TIMED_OUT' if timed_out else 'PASS' if code == 0 and before == after else 'FAIL',
              'durationMs': round((time.monotonic() - start) * 1000),
              'log': log_path.relative_to(ROOT).as_posix(),
              'logSha256': hashlib.sha256(log_path.read_bytes()).hexdigest(),
              'independentReview': 'NOT_PERFORMED', 'releaseReady': False}
    destination = REPORTS / ('current-' + name + '.json')
    destination.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    return 0 if result['outcome'] == 'PASS' else 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError, subprocess.TimeoutExpired) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
