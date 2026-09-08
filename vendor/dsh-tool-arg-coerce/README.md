# dsh-tool-arg-coerce

Host-plane plugin: stop the glob/grep `missing required property "pattern"` loop.

## When

Gemini Flash (cliproxy openai-completions, native invoke) mixes `bash`/`run_code`’s `description` with glob/grep’s required `pattern`. Calls look like `{ description: "pattern: **/*.ts" }`. Validator rejects with no received-keys hint → model calls `tools_help` and repeats.

## What it does

1. `tools/pre-execute` (prepend): if tool is glob/grep, `pattern` missing, and `description` is `pattern: …` or a glob/regex-looking string → copy to `pattern`, drop `description`.
2. `tools/post-execute`: if still INVALID_ARGS, append `received keys: …` and `unknown key "description" (… required string is "pattern")`. Second consecutive fail adds an example.

Does **not** touch `bash` / `run_code` (`description` is a real param).

## Install

Linked from `~/.dsh/profiles/desktop/package.json` as a profile bundle. `pnpm install` in that profile, then restart DSH (or `dev_inject_plugin` if the super-injector is unlocked).

Preset-side twin lives in router-standard v1.27.4 (`tools_help` heading `tool_description:` + same coerce on agent-plane). Agent-plane hook covers the current session after `dev_reload_preset_live`; this package covers every session after host load.

## Tests

```bash
node tests/coerce.test.mjs
```
