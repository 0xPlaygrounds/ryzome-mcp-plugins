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
| `update_ryzome_canvas` | Apply raw canvas operations (create/move/resize/retitle/delete nodes, create/relabel/delete edges) to an existing canvas |
| `verify_ryzome_structure` | Read back a bundle or canvas and report unavailable members/nodes, unlabeled edges, and dangling edge references |
| `create_ryzome_bundle` | Create an ordered collection of existing documents |
| `get_ryzome_bundle` | Retrieve a bundle and its member metadata, including access status |
| `update_ryzome_bundle` | Add, remove, or reorder documents in a bundle |
| `create_ryzome_conversation` | Create an empty conversation (thread), optionally with context documents |
| `get_ryzome_conversation` | Read a conversation with its context and full message history |
| `list_ryzome_conversations` | List conversations, optionally filtered to pinned ones |
| `update_ryzome_conversation` | Update a conversation's title, pinned state, or context |
| `add_ryzome_conversation_message` | Append a user message to a conversation, optionally with context |
| `search_ryzome_conversations` | Search conversations by title or message content |
| `delete_ryzome_conversation` | Delete conversations by ID (caller must own them) |

Use `list_ryzome_documents` with `content_types: ["Bundle"]` to discover bundles.
For current API contracts and features that still need backend authentication support,
see [API compatibility](../../docs/api-compatibility.md).

## Resources

| URI | Type | Description |
|-----|------|-------------|
| `ryzome://canvases` | Static | JSON list of all canvas summaries (ID, name, description, URL) |
| `ryzome://canvas/{id}` | Dynamic | Single canvas rendered as structured markdown with nodes and connections |
| `ryzome://documents` | Static | JSON list of library-visible document summaries (ID, title, content type, URL) |
| `ryzome://document/{id}` | Dynamic | Single document rendered as structured markdown with its content |
| `ryzome://conversations` | Static | JSON list of all conversation summaries (ID, title, pinned state, URL) |
| `ryzome://conversation/{id}` | Dynamic | Single conversation rendered as structured markdown with context and messages |

The dynamic resources support `list` — MCP clients can enumerate all available canvases, documents, and conversations.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `RYZOME_API_KEY` | API key, sent as `x-api-key` (required unless an access token is set) |
| `RYZOME_OPENCLAW_API_KEY` | API key (alternative) |
| `PLUGIN_USER_CONFIG_API_KEY` | API key (set automatically by Claude Code plugin) |
| `RYZOME_ACCESS_TOKEN` | Bearer token, sent as `Authorization: Bearer <token>`; used only when no API key is set |

When both an API key and an access token are present the API key wins. The server refuses tool calls with a setup hint listing both variables when neither is set.

Create tools (`create_ryzome_document`, `create_ryzome_canvas`, `create_ryzome_plan`, `create_ryzome_research`, `create_ryzome_bundle`, `create_ryzome_conversation`) accept an optional caller-supplied 24-hex `id`, and the document/canvas/bundle creators accept `provenance: { tags?, header? }` (tags are appended to the created document; `header` is prepended to Text content). `create_ryzome_canvas` nodes may reference an existing document via `documentId` and carry explicit `x`/`y`/`width`/`height`. The `get_ryzome_*` tools return MCP `structuredContent` alongside the text content.

## Claude Code Plugin

For the full Claude Code experience (skills, agents, hooks, and this MCP server bundled together), install [`@ryzome-ai/ryzome-claude-plugin`](../ryzome-claude-plugin) instead.

## License

MIT
