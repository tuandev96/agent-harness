# @dsh-external/dsh-mcp-settings

Adds **Settings → MCP** to DeepSeek Harness Web.

DSH already ships `@deepseek-ai/dsh-mcp-client`, but it is composition-only
(YAML / ACP). This plugin is the missing GUI: list, add, edit, enable/disable,
delete, and live-mount each server.

## Where config lives

`~/.dsh/mcp-servers.json` (mode `0600`). Not `settings.yaml`.

Each enabled server is `ctx.plugin(@deepseek-ai/dsh-mcp-client, config)`.
Tools appear as `mcp__<serverName>__<tool>`.

## Transports

| Transport | Fields |
|---|---|
| `streamable-http` | `url`, optional `headers` |
| `stdio` | `command`, `args`, optional `env` / `cwd` |

HTTP headers are **static**. OAuth that expires still needs a local proxy.
Resources and prompts are not bridged (mcp-client limitation).

The plugin does not seed any default server. Add servers in Settings → MCP.
