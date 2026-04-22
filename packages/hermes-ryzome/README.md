# hermes-ryzome-plugin

[Ryzome](https://ryzome.ai) canvas and document tools for the [Hermes Agent](https://hermes.ai). Lets an AI agent externalize its working context (plans, research, reasoning) as interactive canvases. Users can inspect, edit, and hand the corrected graph back to the agent.

## Requirements

- Python 3.10+
- Node.js (the wheel bundles a compiled Node runner; `node` must be on `PATH`)
- A Ryzome API key — [get one here](https://ryzome.ai/workspace#settings/api-keys)

## Install

```bash
pip install hermes-ryzome-plugin
hermes ryzome setup --key <api-key>
```

The wheel bundles the Node runner (`ryzome_hermes_plugin/_runner.js`) — no separate npm install is required.

## Configure

```bash
hermes ryzome setup --key <api-key>      # non-interactive
hermes ryzome setup                      # interactive prompt
hermes ryzome status                     # verify
```

Config is written to `~/.hermes/ryzome.json`:

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

Environment variables `RYZOME_API_KEY`, `RYZOME_OPENCLAW_API_KEY`, or `PLUGIN_USER_CONFIG_API_KEY` also work and take precedence over the config file.

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

## CLI Commands

| Command | Description |
|---------|-------------|
| `hermes ryzome setup` | Interactive API key configuration (or pass `--key` for non-interactive) |
| `hermes ryzome status` | Show the current plugin configuration status |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `RYZOME_API_KEY` | API key (standard) |
| `RYZOME_OPENCLAW_API_KEY` | API key (alternative) |
| `PLUGIN_USER_CONFIG_API_KEY` | API key (set automatically by some hosts) |
| `RYZOME_HERMES_RUNNER` | Override the Node runner command (advanced) |
| `RYZOME_HERMES_CONFIG_PATH` | Override the config file path (default: `~/.hermes/ryzome.json`) |

## Troubleshooting

### `Ryzome API key not configured`

Tools register unconditionally but throw this error on call if no key is set. Run `hermes ryzome setup --key <api-key>`, or export `RYZOME_API_KEY`.

### `Could not find a Ryzome Hermes runner`

The wheel ships with a bundled Node runner. If this error appears, verify:
- `node` is on `PATH`
- The wheel installed cleanly (the file `ryzome_hermes_plugin/_runner.js` exists inside the installed package)
- Or set `RYZOME_HERMES_RUNNER` to a command that runs the runner

### 401 or 403 errors

- Verify the API key is valid and has canvas route access
- If using a non-production API, confirm `apiUrl` matches that environment

## License

MIT
