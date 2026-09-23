# @ryzome-ai/ryzome-core

Shared logic for Ryzome canvas integrations: API client, 23 tools, graph builder, layout engine, and markdown formatter.

This package powers [`@ryzome-ai/ryzome-mcp`](../ryzome-mcp), [`@ryzome-ai/openclaw-ryzome`](../openclaw-ryzome), and the Hermes plugin in [`packages/hermes-ryzome`](../hermes-ryzome) (published to PyPI as `hermes-ryzome-plugin`).

## Install

```bash
npm install @ryzome-ai/ryzome-core
```

## Exports

| Entry point | What it provides |
|-------------|-----------------|
| `@ryzome-ai/ryzome-core` | `parseConfig`, `RyzomeClient`, `RyzomeApiError`, `formatCanvasAsMarkdown`, `toolRegistry` |
| `@ryzome-ai/ryzome-core/config` | Config types and constants (`DEFAULT_RYZOME_API_URL`, `RYZOME_API_KEY_ENV_VARS`) |
| `@ryzome-ai/ryzome-core/tools` | Individual tool exports (names, schemas, execute functions) |
| `@ryzome-ai/ryzome-core/lib/ryzome-client` | `RyzomeClient` class and `RyzomeClientConfig` type |

## Tools

The `toolRegistry` array contains 23 ready-to-register tools:

| Tool name | Description |
|-----------|-------------|
| `create_ryzome_document` | Create a standalone Ryzome document that appears in the library |
| `create_ryzome_canvas` | Create a canvas with explicitly defined nodes and edges |
| `get_ryzome_document` | Retrieve a standalone Ryzome document by its ID |
| `create_ryzome_plan` | Create a canvas from a plan — steps auto-chain in order, with optional branching via `dependsOn` |
| `create_ryzome_research` | Create a canvas displaying research findings branching from a root topic |
| `get_ryzome_canvas` | Retrieve a canvas by ID, including all nodes and edges |
| `list_ryzome_documents` | List standalone Ryzome documents, optionally filtered by library visibility, favorites, tags, or content type |
| `list_ryzome_canvases` | List all canvases accessible to the current user |
| `update_ryzome_document` | Update a standalone Ryzome document using document operations and metadata changes |
| `save_ryzome_node_to_library` | Promote an existing canvas node's backing document into the library |
| `upload_ryzome_image` | Upload an image from a URL to an existing canvas as an image node |
| `update_ryzome_canvas` | Submit ordered canvas operations using `canvas_id` |
| `verify_ryzome_structure` | Read back a canvas or bundle using `document_id` |
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

Each tool entry has `name`, `description`, `paramsSchema` (Zod), and an `execute` function.

## Usage

```typescript
import { parseConfig, toClientConfig, RyzomeClient, toolRegistry } from "@ryzome-ai/ryzome-core";

// Resolve config from env vars
const config = toClientConfig(parseConfig({}));
if (!config) throw new Error("Set RYZOME_API_KEY or RYZOME_ACCESS_TOKEN");

// Use tools directly
const createCanvasTool = toolRegistry.find(
  (tool) => tool.name === "create_ryzome_canvas"
)!;
const result = await createCanvasTool.execute(
  {
    title: "My canvas",
    nodes: [{ id: "start", title: "Start", description: "Kick off the flow" }],
  },
  config
);

// Or use the client directly
const client = new RyzomeClient(config);
const canvases = await client.listCanvases();
```

## Configuration

Config is resolved from a config object or environment variables:

| Environment variable | Purpose |
|---------------------|---------|
| `RYZOME_OPENCLAW_API_KEY` | API key (highest priority) |
| `RYZOME_API_KEY` | API key (fallback) |
| `PLUGIN_USER_CONFIG_API_KEY` | API key (used by Claude Code plugin) |
| `RYZOME_ACCESS_TOKEN` | Bearer credential when no API key is configured |
| `PLUGIN_USER_CONFIG_ACCESS_TOKEN` | Bearer credential fallback |

Explicit config values take precedence over environment values in TypeScript. API keys take precedence over bearer credentials.

Config values support `${ENV_VAR}` syntax for environment variable interpolation.

## License

MIT
