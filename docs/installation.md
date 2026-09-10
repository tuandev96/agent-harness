# Installation, updates and rollback

[README](../README.md) · [Agent setup](agents.md) · [Usage](usage.md) · [Tiếng Việt](huong-dan.vi.md)

This guide documents the installer in [`scripts/install.mjs`](../scripts/install.mjs) and [`src/core/installer.ts`](../src/core/installer.ts), reviewed against checkpoint `6ab731c` on 2026-09-09. It installs **portable files**, not native agent hooks or the DSH runtime.

## Platforms and prerequisites

Use Node.js 24+ for the build, installer and local runtime. Install Git and Python 3.10+ (`python3` on PATH) for the validator and checks. npm installs the pinned TypeScript development toolchain; the runtime has no direct model/API dependency. Your coding agent still needs its own normal installation, account and permissions.

Examples below use Bash on macOS/Linux. Windows users can follow the Bash examples inside WSL with Node/Python installed **inside WSL**. A WSL run is Linux evidence, not Windows/Git Bash process-tree acceptance. Native PowerShell quoting and symlink behavior differ; this repository does not claim a fully verified Windows installation path.

There are three different locations:

| Location | Purpose |
|---|---|
| `HARNESS_HOME` | Checkout containing `package.json`, source, build output and scripts |
| Portable target, e.g. `$PROJECT/.agents` | Installed protocol, templates and requirements skill |
| `$PROJECT/.harness` | Optional CLI identity/database, created only by `init --apply` |

Do not confuse an installed skill directory with a complete runtime checkout. The portable installer does **not** copy `src/`, `dist/`, `bin/`, DSH plugins or a Node toolchain.

## Prepare the checkout

```bash
git clone https://github.com/tuandev96/agent-harness.git
cd agent-harness
export HARNESS_HOME="$(pwd -P)"

node --version
python3 --version
npm ci --ignore-scripts
npm run typecheck
npm run build
node "$HARNESS_HOME/bin/harness.mjs" doctor --root "$HARNESS_HOME"
```

For an existing checkout, inspect `git status` and select the revision you intend to use instead of cloning again. Do not reset/stash other work to make setup easier. No `npm link`, global npm installation or API key is needed for the commands above.

`npm run build` strips TypeScript and creates `dist/` plus exported schemas. It does not typecheck. Run the pinned typecheck separately. Experimental Node warnings are not equivalent to failed checks; use the command's exit code and diagnostics. Timeout is not PASS.

Expected doctor fields include `runtimeSupported: true`, `buildCurrent: true`, `trust: "ASSISTED"` and `releaseReady: false`. `projectInitialized: false` is normal before opting into the CLI. Doctor does not inspect native agent loaders or certify the test suite.

## Recommended: project-local portable files

Choose a project you are authorized to modify:

```bash
export PROJECT="/absolute/path/to/your-project"
mkdir -p "$PROJECT/.agents"
node "$HARNESS_HOME/scripts/install.mjs" --target "$PROJECT/.agents"
```

Inspect every `changes` entry. `conflict: true` means a differing existing file is not recognized as owned by a completed installation receipt. The installer will not overwrite it. Keep your file, reconcile it explicitly, or choose a separate target; do not delete receipts to force ownership.

Then apply:

```bash
node "$HARNESS_HOME/scripts/install.mjs" --target "$PROJECT/.agents" --apply
```

The final JSON output contains `receipt` and `changed`. The command prints the preview first and the result separately, so its entire stdout is **not a single JSON document**.

Resulting layout:

```text
your-project/
  .agents/
    AGENTS.md                       Generated loader with absolute local paths
    rules/harness-protocol.md
    templates/task-spec.md
    templates/reviewer-prompt.md
    hooks/
      README.md
      protected-paths.sh
      test-edit-protect.sh
      secret-diff.sh
      production-gate.sh
      settings.example.json
    skills/capture-intent/
      SKILL.md
      assets/intent-template.md
    skills/requirements-spec/
      SKILL.md
      references/
      assets/
      scripts/validate_spec.py
      tests/
      source-manifest.json
    skills/plan-mode/
      SKILL.md
      assets/plan-template.md
    skills/review-policy/
      SKILL.md
      assets/REVIEW-template.md
    .harness-installations/<id>.json Local before/after backups and hashes
  AGENTS.md                         Root loader you merge separately
```

The generated `.agents/AGENTS.md` is not a substitute for the root loader. Merge the root snippet in [agent setup](agents.md#shared-project-loader). Use relative project paths in shared instructions. The generated target loader contains absolute paths and should remain local.

The installed skills require their **whole directories**, not just `SKILL.md`: relative references and validation scripts depend on the accompanying files. Hook scripts are reference hard controls — copy/merge `hooks/settings.example.json` into the host (for example Claude Code `.claude/settings.json`) if you want them to run.

## Alternative: one personal installation

A shared personal target avoids copying the bundle into every project:

```bash
mkdir -p "$HOME/.agents"
node "$HARNESS_HOME/scripts/install.mjs" --target "$HOME/.agents"
# Only after resolving conflicts and reviewing the changes:
node "$HARNESS_HOME/scripts/install.mjs" --target "$HOME/.agents" --apply
```

Existing setups may already have a different protocol or skill in this directory. A conflict is expected protection, not a reason to use `--force` (there is no such option).

Next, merge pointers into the actual [native instruction files](agents.md#personal-installation-pointers). A `~/.agents/AGENTS.md` file alone is not a universal global loader for every agent. Allow access to the selected directory only through the native client's normal permission controls.

Personal filesystem paths are not available in a cloud or remote environment unless that environment is separately provisioned. Prefer project-local files for shared repos and remote jobs.

## Files to keep out of Git

Before committing a target project, merge these entries into its `.gitignore`:

```gitignore
# Private runtime identity, database and evidence
/.harness/
/.harness-checks/

# Machine-specific loader and installation backups
/.agents/AGENTS.md
/.agents/.harness-installations/
/.agents/.harness-install.lock
```

For a different portable target, adjust the last three paths. When authorized, a team may commit `.agents/rules/`, `.agents/templates/`, `.agents/skills/` and the relative root loader. Do not ignore the whole `.agents/` directory if you expect those files to travel with the project.

Receipts contain base64-encoded **full before/after bytes**, potentially including prior instruction content. They are backups, not harmless public metadata. Keep them private even though the original install input was just documentation. The installer does not modify your `.gitignore` for you.

## Confirm the installation

```bash
test -f "$PROJECT/.agents/rules/harness-protocol.md"
test -f "$PROJECT/.agents/skills/capture-intent/SKILL.md"
test -f "$PROJECT/.agents/skills/plan-mode/SKILL.md"
test -f "$PROJECT/.agents/skills/review-policy/SKILL.md"
test -f "$PROJECT/.agents/hooks/README.md"
test -f "$PROJECT/.agents/skills/requirements-spec/SKILL.md"
python3 "$PROJECT/.agents/skills/requirements-spec/scripts/validate_spec.py" \
  "$PROJECT/.agents/skills/requirements-spec/tests/fixtures/good.md"
```

Then run the [agent loading check](agents.md#verify-loading) in a new native session. File existence and validator success do not prove that an agent loaded the instructions.

To run repository checks without installing into any agent home:

```bash
cd "$HARNESS_HOME"
node scripts/build-plugins.mjs
npm test
npm run package:check
```

## Update an installation

Keep the original receipts. Inspect the checkout diff, choose the new revision, reinstall pinned dependencies if they changed, and rebuild. Run the same preview/apply commands against the **same target**. The installer accepts byte-identical files and changes recognized from completed receipts; it rejects conflicting user edits.

The preview is recomputed when you invoke `--apply`; the CLI does not accept a previously saved preview as an apply token. Apply validates the target against its in-memory plan and writes a receipt before making changes. Avoid editing the target during either step.

Updating portable files does not migrate an existing project's accepted requirements/policy, rewrite task history or reinstall copied native-skill folders. Explicitly review those changes. If you registered a second skill copy for an agent, update that copy separately with a diff; do not create silent version drift.

## Roll back a portable installation

Take the UUID filename from the returned receipt, without `.json`. Set it to the actual ID, not the placeholder below:

```bash
export RECEIPT_ID="the-uuid-from-your-installation"
node "$HARNESS_HOME/scripts/install.mjs" --target "$PROJECT/.agents" \
  --rollback "$RECEIPT_ID"
node "$HARNESS_HOME/scripts/install.mjs" --target "$PROJECT/.agents" \
  --rollback "$RECEIPT_ID" --apply
```

The first command reports rollback intent only; **it does not prevalidate the receipt or every conflict**. The `--apply` invocation validates the receipt and current hashes. Rollback refuses to overwrite subsequent user changes. Save those changes and reconcile them before retrying.

Rollback restores/deletes installation-owned files, not the project database, manually added root loader, native loader snippets, extra skill copies or directories. With multiple updates, unwind the applicable receipts newest-first. An interrupted install may have a `PREPARED` receipt that can restore partial writes. Do not remove a lock while its writer is alive; see [troubleshooting](troubleshooting.md).

Implementation details and source-of-truth options: [`scripts/install.mjs`](../scripts/install.mjs), [`src/core/installer.ts`](../src/core/installer.ts), [`package.json`](../package.json).
