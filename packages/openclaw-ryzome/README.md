![claw-ryzome](https://github.com/user-attachments/assets/822727dc-dcd6-4af1-bc81-856a4e9a521f)

# @ryzome-ai/openclaw-ryzome

[Ryzome](https://ryzome.ai/claw) plugin for [OpenClaw](https://docs.openclaw.ai). Lets an AI agent externalize its working context (plans, research, reasoning) as interactive canvases. Users can inspect, edit, and hand the corrected graph back to the agent.

## Requirements

- [OpenClaw](https://docs.openclaw.ai/plugin)
- A Ryzome API key — [get one here](https://ryzome.ai/api-key)

## Install

```bash
openclaw plugins install @ryzome-ai/openclaw-ryzome
```

For local development from a monorepo checkout:

```bash
git clone https://github.com/0xPlaygrounds/ryzome-mcp-plugins
cd ryzome-mcp-plugins
pnpm install
openclaw plugins install -l packages/openclaw-ryzome
```

## Configure

```bash
openclaw ryzome setup
```

Then restart OpenClaw. You can also configure manually in `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "openclaw-ryzome": {
        "enabled": true,
        "config": {
          "apiKey": "rz_...",
          "apiUrl": "https://api.ryzome.ai",
          "appUrl": "https://ryzome.ai"
        }
      }
    }
  }
}
```

### Config fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `apiKey` | Yes | — | Ryzome API key |
| `apiUrl` | No | `https://api.ryzome.ai` | API base URL |
| `appUrl` | No | `https://ryzome.ai` | App base URL (for viewer links) |

Environment variables `RYZOME_OPENCLAW_API_KEY` or `RYZOME_API_KEY` also work.

## Tools

| Tool | Description |
|------|-------------|
| `create_ryzome_canvas` | Create a canvas with explicitly defined nodes and edges |
| `create_ryzome_plan` | Create a canvas from sequential steps (auto-chained, with optional branching via `dependsOn`) |
| `create_ryzome_research` | Create a canvas with research findings branching from a root topic |
| `get_ryzome_canvas` | Retrieve a canvas by ID with all nodes and edges |
| `list_ryzome_canvases` | List all canvases accessible to the current user |
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
| `openclaw ryzome setup` | Interactive API key configuration |
| `openclaw ryzome status` | Check plugin configuration and API connectivity |

## Troubleshooting

### The plugin loads but tools are missing

- Restart OpenClaw after installing or changing config
- Run `openclaw ryzome setup` if not configured yet
- Check `plugins.entries.openclaw-ryzome.enabled` is `true`

### `apiKey is required in config`

- Run `openclaw ryzome setup`, or set `RYZOME_OPENCLAW_API_KEY`

### 401 or 403 errors

- Verify the API key is valid and has canvas route access
- If using a non-production API, confirm `apiUrl` matches that environment

### Canvas creation or patching fails

The plugin surfaces which stage failed (`createCanvas`, `patchCanvas`, `patchSharingConfig`). For transient failures, it retries post-create steps automatically.

## License

MIT
