# @ryzome-ai/hermes-ryzome

[Ryzome](https://ryzome.ai/claw) plugin for [Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins). Lets an AI agent externalize its working context (plans, research, reasoning) as interactive canvases. Users can inspect, edit, and hand the corrected graph back to the agent.

## Requirements

- [Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins)
- A Ryzome API key — [get one here](https://ryzome.ai/workspace#settings/api-keys)
- Node.js and `npx` available on `PATH`

The Hermes plugin surface is Python, but tool execution is delegated to the shared Node runner so Hermes, OpenClaw, and MCP reuse the same `toolRegistry`.

## Install

Hermes discovers user plugins under `~/.hermes/plugins/` by loading a directory that contains a `plugin.yaml` manifest and Python entrypoint. For a local rollout from this monorepo:

```bash
git clone https://github.com/0xPlaygrounds/ryzome-mcp-plugins
cd ryzome-mcp-plugins
pnpm install
pnpm build
mkdir -p ~/.hermes/plugins
ln -s "$PWD/packages/hermes-ryzome" ~/.hermes/plugins/ryzome
```

Restart Hermes after linking the plugin. The `ryzome` plugin should then appear in `hermes plugins list`, and its tools become callable after configuration.

This package is also published as a Python Hermes plugin entry point. Even in that mode, Node.js and `npx` still need to be available because the Python layer launches the shared runner.

## Configure

The canonical onboarding commands are:

```bash
hermes ryzome setup --key <api-key>      # non-interactive
hermes ryzome setup                      # interactive prompt
hermes ryzome status                     # verify
```

The plugin stores config in `~/.hermes/ryzome.json` by default:

```json
{
  "apiKey": "rz_...",
  "apiUrl": "https://api.ryzome.ai",
  "appUrl": "https://ryzome.ai"
}
```

### Config fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `apiKey` | Yes | — | Ryzome API key |
| `apiUrl` | No | `https://api.ryzome.ai` | API base URL |
| `appUrl` | No | `https://ryzome.ai` | App base URL (for viewer links) |

The plugin also accepts `RYZOME_API_KEY`, `RYZOME_OPENCLAW_API_KEY`, or `PLUGIN_USER_CONFIG_API_KEY` from the environment. If you do not want to store the raw key in `~/.hermes/ryzome.json`, `apiKey` can also be set to `${ENV_VAR}` and resolved at runtime.

### Advanced overrides

- `RYZOME_HERMES_CONFIG_PATH` overrides the default config file location.
- `RYZOME_HERMES_RUNNER` overrides the command used to launch the Node runner.

## Tools

| Tool | Description |
|------|-------------|
| `create_ryzome_document` | Create a standalone Ryzome document that appears in the library |
| `create_ryzome_canvas` | Create a canvas with explicitly defined nodes and edges |
| `get_ryzome_document` | Retrieve a standalone Ryzome document by its ID |
| `create_ryzome_plan` | Create a canvas from sequential steps (auto-chained, with optional branching via `dependsOn`) |
| `create_ryzome_research` | Create a canvas with research findings branching from a root topic |
| `get_ryzome_canvas` | Retrieve a canvas by ID with all nodes and edges |
| `list_ryzome_documents` | List standalone Ryzome documents, optionally filtered by library visibility, favorites, tags, or content type |
| `list_ryzome_canvases` | List all canvases accessible to the current user |
| `update_ryzome_document` | Update a standalone Ryzome document using document operations and metadata changes |
| `save_ryzome_node_to_library` | Promote an existing canvas node's backing document into the library |
| `upload_ryzome_image` | Upload an image from a URL to an existing canvas as an image node |

### `create_ryzome_canvas`

Full control over nodes and edges:

```json
{
  "title": "Research plan",
  "nodes": [
    { "id": "a", "title": "Collect sources", "description": "Gather papers.", "color": "#4CAF50", "group": "g1" },
    { "id": "b", "title": "Synthesize", "description": "Summarize evidence.", "group": "g1" }
  ],
  "edges": [{ "from": "a", "to": "b", "label": "feeds" }],
  "groups": [{ "id": "g1", "title": "Phase 1", "color": "#4ECDC4" }]
}
```

### `create_ryzome_plan`

Sequential steps, auto-chained:

```json
{
  "title": "Launch plan",
  "steps": [
    { "title": "Draft announcement", "description": "Write initial copy." },
    { "title": "Review messaging", "description": "Tighten claims." },
    { "id": "ship", "title": "Ship", "dependsOn": ["step-0"] }
  ]
}
```

### `create_ryzome_research`

Root topic with branching findings:

```json
{
  "title": "Model evaluation",
  "topic": "How should we evaluate groundedness?",
  "topicColor": "#FF6B6B",
  "findings": [
    { "id": "f1", "title": "Source visibility matters", "description": "Users need to see cited sources.", "dependsOn": ["topic"] },
    { "id": "f2", "title": "Correction loops needed", "description": "Allow users to flag incorrect claims.", "dependsOn": ["f1"] }
  ]
}
```

### `get_ryzome_canvas`

```json
{ "canvas_id": "0123456789abcdef01234567" }
```

### `list_ryzome_canvases`

```json
{ "pinned": true }
```

Optional `pinned` boolean filter. Returns all accessible canvases with names, IDs, and descriptions.

### `upload_ryzome_image`

```json
{ "canvas_id": "0123456789abcdef01234567", "image_url": "https://example.com/diagram.png" }
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `hermes ryzome setup` | Interactive or non-interactive API key configuration |
| `hermes ryzome status` | Show the current plugin configuration status |

## Troubleshooting

### The plugin does not appear in Hermes

- Verify the plugin lives under `~/.hermes/plugins/ryzome`
- Make sure the directory contains `plugin.yaml` and `__init__.py`
- Restart Hermes after linking or updating the plugin
- Run `hermes plugins list` to confirm Hermes discovered it

### `Ryzome API key not configured`

- Run `hermes ryzome setup --key <api-key>`
- Or set `RYZOME_API_KEY`, `RYZOME_OPENCLAW_API_KEY`, or `PLUGIN_USER_CONFIG_API_KEY`
- Run `hermes ryzome status` to verify the resolved config

### `Could not find a Ryzome Hermes runner`

- Build the local package with `pnpm --filter @ryzome-ai/hermes-ryzome build`
- Ensure Node.js and `npx` are installed and available on `PATH`
- If you need a custom runner command, set `RYZOME_HERMES_RUNNER`

### 401 or 403 errors

- Verify the API key is valid and has access to the Ryzome document and canvas routes
- If using a non-production API, confirm `apiUrl` matches that environment

### Canvas creation or patching fails

The plugin surfaces which stage failed (`createCanvas`, `patchCanvas`, `patchSharingConfig`). The shared runner retries post-create stages automatically for transient failures.

## License

MIT
