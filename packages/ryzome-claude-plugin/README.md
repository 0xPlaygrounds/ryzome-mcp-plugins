# @ryzome-ai/ryzome-claude-plugin

Ryzome plugin for Claude Code. Adds canvas tools, context resources, skills, and a context agent.

## Install

In Claude Code:

```
/plugin add @ryzome-ai/ryzome-claude-plugin
```

You'll be prompted for your Ryzome API key (stored securely in your system keychain).

## What's Included

- **5 MCP Tools**: create_ryzome_canvas, get_ryzome_canvas, list_ryzome_canvases, create_ryzome_plan, create_ryzome_research
- **MCP Resources**: Attach canvases as context via `ryzome://canvas/{id}`
- **Skills**: `/plan`, `/research`, `/ryzome-status`
- **Agent**: `ryzome-context` for canvas content retrieval
