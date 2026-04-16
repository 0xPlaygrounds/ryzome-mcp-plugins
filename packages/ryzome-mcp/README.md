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
| `create_ryzome_document` | Create a standalone Ryzome document that appears in the library |
| `create_ryzome_canvas` | Create a canvas with explicitly defined nodes and edges |
| `get_ryzome_document` | Retrieve a standalone Ryzome document by its ID |
| `create_ryzome_plan` | Create a canvas from sequential steps (auto-chained, with optional branching) |
| `create_ryzome_research` | Create a canvas with research findings branching from a root topic |
| `get_ryzome_canvas` | Retrieve a canvas by ID with all nodes and edges |
| `list_ryzome_documents` | List standalone Ryzome documents, optionally filtered by library visibility, favorites, tags, or content type |
| `list_ryzome_canvases` | List all canvases accessible to the current user |
| `update_ryzome_document` | Update a standalone Ryzome document using document operations and metadata changes |
| `save_ryzome_node_to_library` | Promote an existing canvas node's backing document into the library |
| `upload_ryzome_image` | Upload an image from a URL to an existing canvas |

## Resources

| URI | Type | Description |
|-----|------|-------------|
| `ryzome://canvases` | Static | JSON list of all canvas summaries (ID, name, description, URL) |
| `ryzome://canvas/{id}` | Dynamic | Single canvas rendered as structured markdown with nodes and connections |
| `ryzome://documents` | Static | JSON list of library-visible document summaries (ID, title, content type, URL) |
| `ryzome://document/{id}` | Dynamic | Single document rendered as structured markdown with its content |

The dynamic resources support `list` — MCP clients can enumerate all available canvases and documents.

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
