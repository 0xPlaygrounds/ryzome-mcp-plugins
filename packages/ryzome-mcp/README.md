# @ryzome-ai/ryzome-mcp

MCP server that exposes [Ryzome](https://ryzome.ai) canvas tools and resources to Claude Code, Claude Desktop, and any MCP-compatible client.

## Quick Start

```bash
RYZOME_API_KEY=rz_... npx @ryzome-ai/ryzome-mcp
```

Get your API key at [ryzome.ai/api-key](https://ryzome.ai/api-key).

## MCP Client Configuration

Add to your `.mcp.json` or MCP client config:

```json
{
  "mcpServers": {
    "ryzome": {
      "command": "npx",
      "args": ["-y", "@ryzome-ai/ryzome-mcp"],
      "env": {
        "RYZOME_API_KEY": "rz_..."
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `create_ryzome_canvas` | Create a canvas with explicitly defined nodes and edges |
| `create_ryzome_plan` | Create a canvas from sequential steps (auto-chained, with optional branching) |
| `create_ryzome_research` | Create a canvas with research findings branching from a root topic |
| `get_ryzome_canvas` | Retrieve a canvas by ID with all nodes and edges |
| `list_ryzome_canvases` | List all canvases accessible to the current user |
| `upload_ryzome_image` | Upload an image from a URL to an existing canvas |

## Resources

| URI | Type | Description |
|-----|------|-------------|
| `ryzome://canvases` | Static | JSON list of all canvas summaries (ID, name, description, URL) |
| `ryzome://canvas/{id}` | Dynamic | Single canvas rendered as structured markdown with nodes and connections |

The dynamic resource supports `list` — MCP clients can enumerate all available canvases.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `RYZOME_API_KEY` | API key (required) |
| `RYZOME_OPENCLAW_API_KEY` | API key (alternative) |
| `PLUGIN_USER_CONFIG_API_KEY` | API key (set automatically by Claude Code plugin) |

## Claude Code Plugin

For the full Claude Code experience (skills, agents, hooks, and this MCP server bundled together), install [`@ryzome-ai/ryzome-claude-plugin`](../ryzome-claude-plugin) instead.

## License

MIT
