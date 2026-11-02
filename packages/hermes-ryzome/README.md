# hermes-ryzome-plugin

[Ryzome](https://ryzome.ai) canvas and document tools for the [Hermes Agent](https://hermes.ai). Lets an AI agent externalize its working context (plans, research, reasoning) as interactive canvases. Users can inspect, edit, and hand the corrected graph back to the agent.

## Requirements

- Python 3.10+
- Node.js (the wheel bundles a compiled Node runner; `node` must be on `PATH`)
- A Ryzome API key or bearer token — [get one here](https://ryzome.ai/workspace#settings/api-keys)

## Install

```bash
pip install hermes-ryzome-plugin
hermes plugins enable ryzome
export RYZOME_API_KEY=<api-key>
```

Hermes disables discovered plugins by default, including pip-installed ones, so `hermes plugins enable ryzome` is required after `pip install`.

For git installs via Hermes:

```bash
hermes plugins install 0xPlaygrounds/hermes-ryzome-plugin --enable
```

Configure one credential before using the tools: `RYZOME_API_KEY` or `RYZOME_ACCESS_TOKEN`. You can save it in `~/.hermes/.env`.

The wheel bundles the Node runner (`ryzome_hermes_plugin/_runner.js`) — no separate npm install is required.

## Configure

The manifest lists both credentials as optional because either one is sufficient. Tool availability is checked by the plugin against the resolved environment or config-file credential.

You can also configure the plugin manually with either:

```bash
export RYZOME_API_KEY=<api-key>
```

or a config file at `~/.hermes/ryzome.json`:

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
| `apiKey` | Either credential | — | Ryzome API key |
| `accessToken` | Either credential | — | Ryzome bearer token; used when no API key is configured |
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

## Slash Commands

| Command | Description |
|---------|-------------|
| `/ryzome-status` | Show Ryzome plugin configuration status inside a Hermes session |

`/ryzome-status` reports the selected authentication mode and masks the credential. Hermes receives `structuredContent` alongside text tool results.

There is no separate plugin auth step inside `hermes setup` for general plugins.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `RYZOME_API_KEY` | API key (standard) |
| `RYZOME_OPENCLAW_API_KEY` | API key (alternative) |
| `PLUGIN_USER_CONFIG_API_KEY` | API key (set automatically by some hosts) |
| `RYZOME_ACCESS_TOKEN` | Bearer token when no API key is configured |
| `PLUGIN_USER_CONFIG_ACCESS_TOKEN` | Bearer token fallback |
| `RYZOME_HERMES_RUNNER` | Override the Node runner command (advanced) |
| `RYZOME_HERMES_CONFIG_PATH` | Override the config file path (default: `~/.hermes/ryzome.json`) |

## Troubleshooting

### Missing credentials

Set `RYZOME_API_KEY` or `RYZOME_ACCESS_TOKEN`, or configure `apiKey` or `accessToken` in `~/.hermes/ryzome.json`. Tools remain unavailable until a credential resolves. API keys take precedence when both credential types are supplied.

### `Could not find a Ryzome Hermes runner`

The wheel ships with a bundled Node runner. If this error appears, verify:
- `node` is on `PATH`
- The wheel installed cleanly (the file `ryzome_hermes_plugin/_runner.js` exists inside the installed package)
- Or set `RYZOME_HERMES_RUNNER` to a command that runs the runner

### 401 or 403 errors

- Verify the selected credential is valid and has canvas route access
- If using a non-production API, confirm `apiUrl` matches that environment

## License

MIT
