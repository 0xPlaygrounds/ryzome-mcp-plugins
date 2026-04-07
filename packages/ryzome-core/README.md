# @ryzome-ai/ryzome-core

Shared logic for Ryzome canvas integrations: API client, 6 canvas tools, graph builder, layout engine, and markdown formatter.

This package powers [`@ryzome-ai/ryzome-mcp`](../ryzome-mcp) and [`@ryzome-ai/openclaw-ryzome`](../openclaw-ryzome).

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

The `toolRegistry` array contains 6 ready-to-register tools:

| Tool name | Description |
|-----------|-------------|
| `create_ryzome_canvas` | Create a canvas with explicitly defined nodes and edges |
| `create_ryzome_plan` | Create a canvas from a plan — steps auto-chain in order, with optional branching via `dependsOn` |
| `create_ryzome_research` | Create a canvas displaying research findings branching from a root topic |
| `get_ryzome_canvas` | Retrieve a canvas by ID, including all nodes and edges |
| `list_ryzome_canvases` | List all canvases accessible to the current user |
| `upload_ryzome_image` | Upload an image from a URL to an existing canvas as an image node |

Each tool entry has `name`, `description`, `paramsSchema` (Zod), and an `execute` function.

## Usage

```typescript
import { parseConfig, RyzomeClient, toolRegistry } from "@ryzome-ai/ryzome-core";

// Resolve config from env vars
const config = parseConfig({});

// Use tools directly
const result = await toolRegistry[0].execute(
  { title: "My canvas", nodes: [], edges: [] },
  { apiKey: config.apiKey!, apiUrl: config.apiUrl, appUrl: config.appUrl }
);

// Or use the client directly
const client = new RyzomeClient({
  apiKey: config.apiKey!,
  apiUrl: config.apiUrl,
  appUrl: config.appUrl,
});
const canvases = await client.listCanvases();
```

## Configuration

Config is resolved from a config object or environment variables:

| Environment variable | Purpose |
|---------------------|---------|
| `RYZOME_OPENCLAW_API_KEY` | API key (highest priority) |
| `RYZOME_API_KEY` | API key (fallback) |
| `PLUGIN_USER_CONFIG_API_KEY` | API key (used by Claude Code plugin) |

Config values support `${ENV_VAR}` syntax for environment variable interpolation.

## License

MIT
