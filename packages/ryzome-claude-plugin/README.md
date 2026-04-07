# @ryzome-ai/ryzome-claude-plugin

[Ryzome](https://ryzome.ai) plugin for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Adds canvas tools, context resources, skills, and a context retrieval agent.

## Install

In Claude Code:

```
/install-plugin @ryzome-ai/ryzome-claude-plugin
```

You'll be prompted for your Ryzome API key (stored securely in your system keychain). Get one at [ryzome.ai/api-key](https://ryzome.ai/api-key).

## What's Included

### MCP Tools (6)

| Tool | Description |
|------|-------------|
| `create_ryzome_canvas` | Create a canvas with explicitly defined nodes and edges |
| `create_ryzome_plan` | Create a canvas from sequential steps (auto-chained) |
| `create_ryzome_research` | Create a canvas with research findings branching from a topic |
| `get_ryzome_canvas` | Retrieve a canvas by ID with all nodes and edges |
| `list_ryzome_canvases` | List all accessible canvases |
| `upload_ryzome_image` | Upload an image from a URL to an existing canvas |

### MCP Resources

| URI | Description |
|-----|-------------|
| `ryzome://canvases` | JSON list of all canvas summaries |
| `ryzome://canvas/{id}` | Single canvas rendered as structured markdown |

### Skills

| Skill | Args | Description |
|-------|------|-------------|
| `/plan` | `goal` (required) | Break a goal into steps and create a plan canvas |
| `/research` | `topic` (required) | Organize findings on a topic into a research canvas |
| `/ryzome-status` | — | Check API connection and list recent canvases |

### Agent

**`ryzome-context`** — A lightweight (Haiku-powered) context retrieval agent that finds and summarizes canvas content. It has access to `list_ryzome_canvases` and `get_ryzome_canvas`.

### Hooks

**`SessionStart`** — Displays a status message confirming the Ryzome plugin is active and listing available skills.

## Configuration

The plugin uses Claude Code's `userConfig` system:

1. On install, you're prompted for `api_key` (marked as sensitive, stored in keychain)
2. Claude Code sets `PLUGIN_USER_CONFIG_API_KEY` in the MCP server's environment
3. The bundled MCP server (`@ryzome-ai/ryzome-mcp`) reads it via `RYZOME_API_KEY`

```
userConfig.api_key → PLUGIN_USER_CONFIG_API_KEY env var → ryzome-mcp server
```

## Architecture

This package ships no code — it's a static configuration bundle:

```
.claude-plugin/plugin.json   # Plugin manifest (name, scopes, userConfig)
.mcp.json                    # Bundled MCP server config (npx @ryzome-ai/ryzome-mcp)
skills/                      # /plan, /research, /ryzome-status
agents/                      # ryzome-context retrieval agent
hooks/                       # SessionStart greeting
```

The actual tool logic lives in [`@ryzome-ai/ryzome-mcp`](../ryzome-mcp), which is run via `npx` when Claude Code starts the MCP server.

## License

MIT
