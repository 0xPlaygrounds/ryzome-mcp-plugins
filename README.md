![claw-ryzome](https://github.com/user-attachments/assets/822727dc-dcd6-4af1-bc81-856a4e9a521f)

# Ryzome OpenClaw Plugin
Steering an OpenClaw agent by prompting your way to the right output is slow and inaccurate. With [Ryzome](https://ryzome.ai/claw), you can inspect the agent's working context as a canvas, correct the map when it drifts, and continue from a better state instead of wrestling with a wall of text.

## Examples of workflow
1. Catch wrong assumptions during planning
2. Trace what went wrong after a bad output
3. Correct the agent's state mid-workflow instead of restarting from scratch

## How it works
1. **Ask for a canvas —** of its context (plan, completed steps, reasoning state, etc.)
2. **Open the URL —** each step becomes a node, with dependency edges showing how the context is connected.
3. **Edit the graph —** fix wrong assumptions, add missing context, or rewire links the agent missed.
4. **Hand it back —** ask the agent to re-read the canvas and continue from the corrected state.

## Requirements

- [OpenClaw](https://docs.openclaw.ai/plugin)
- A Ryzome API key [link](https://ryzome.ai/api-key)
  
## Install

### From npm

If the package is published to npm, install it with:

```bash
openclaw plugins install @ryzome-ai/openclaw-ryzome
```

OpenClaw plugin install behavior is documented in the official plugin docs:
[Plugins](https://docs.openclaw.ai/plugin).

To install from a local checkout, see [Install from a local checkout](#install-from-a-local-checkout).

## Configure

After installation, configure the plugin with:

```bash
openclaw ryzome setup
```

Then restart OpenClaw.

You can also configure the plugin manually under `plugins.entries.openclaw-ryzome.config`.

Example `~/.openclaw/openclaw.json` snippet:

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

Config fields:

- `apiKey`: required Ryzome API key
- `apiUrl`: optional API base URL, defaults to `https://api.ryzome.ai`
- `appUrl`: optional app base URL, defaults to `https://ryzome.ai`

Environment-based setup is also supported:

- `RYZOME_OPENCLAW_API_KEY`
- `RYZOME_API_KEY`

## Run

Once installed and configured, use OpenClaw normally and ask it to map a plan,
research thread, or working context into Ryzome.

The plugin currently exposes four tools:

- `create_ryzome_canvas`
- `create_ryzome_plan`
- `create_ryzome_research`
- `get_ryzome_canvas`

### `create_ryzome_canvas`

Use this when you want full control over nodes and edges.

Expected input shape:

```json
{
  "title": "Research plan",
  "description": "Optional canvas description",
  "nodes": [
    {
      "id": "collect-sources",
      "title": "Collect sources",
      "description": "Gather primary sources and relevant papers."
    },
    {
      "id": "synthesize",
      "title": "Synthesize findings",
      "description": "Summarize the strongest evidence."
    }
  ],
  "edges": [
    {
      "from": "collect-sources",
      "to": "synthesize",
      "label": "feeds"
    }
  ]
}
```

Notes:

- `nodes[].id` must be unique within the request
- `edges[].from` and `edges[].to` should only reference node IDs in the same request
- `edges` is optional if you only need disconnected nodes

### `create_ryzome_plan`

Use this when the context is naturally a sequence of steps. Steps are chained in
order by default, but you can override that with explicit `dependsOn`.

Expected input shape:

```json
{
  "title": "Launch plan",
  "description": "From draft to release",
  "steps": [
    {
      "title": "Draft announcement",
      "description": "Write the initial product announcement."
    },
    {
      "title": "Review messaging",
      "description": "Tighten claims and remove ambiguity."
    },
    {
      "id": "ship",
      "title": "Ship launch assets",
      "description": "Publish the final version.",
      "dependsOn": ["step-1"]
    }
  ]
}
```

Notes:

- If `id` is omitted, the tool assigns `step-0`, `step-1`, and so on
- If `dependsOn` is omitted, each step depends on the previous step
- Use explicit `dependsOn` when you want branching or merging instead of a linear chain

### `create_ryzome_research`

Use this when you want a root topic with findings branching from it. Findings
can depend on `topic` or on other findings.

Expected input shape:

```json
{
  "title": "Model evaluation research",
  "description": "Working notes on model quality and failure modes",
  "topic": "How should we evaluate groundedness?",
  "findings": [
    {
      "id": "f1",
      "title": "Groundedness needs source visibility",
      "description": "A claim is easier to validate when the originating context is visible.",
      "dependsOn": ["topic"]
    },
    {
      "id": "f2",
      "title": "Evaluation should include correction loops",
      "description": "A useful system should support editing context, not only scoring outputs.",
      "dependsOn": ["f1"]
    }
  ]
}
```

Notes:

- The root topic node is created automatically with id `topic`
- `findings[].id` must be unique within the request
- Use `dependsOn: ["topic"]` to attach a finding directly to the root

### `get_ryzome_canvas`

Use this when the agent needs to re-read an existing canvas before continuing.

Expected input shape:

```json
{
  "canvas_id": "0123456789abcdef01234567"
}
```

On success, the create tools return:

- the created canvas title
- the node and edge counts
- a Ryzome viewer URL

`get_ryzome_canvas` returns the canvas payload as JSON, including:

- canvas id, name, and description
- node and edge counts
- full `nodes` and `edges` arrays

## Local Development

Useful commands:

```bash
pnpm --filter @ryzome/openclaw-ryzome typecheck
pnpm --filter @ryzome/openclaw-ryzome test
```

If you installed the plugin with `-l`, OpenClaw uses the linked local directory.
After code changes, restart OpenClaw so the updated plugin code is reloaded.

For local configuration checks:

```bash
openclaw ryzome status
```

#### Install from a local checkout

For local development from this monorepo:

```bash
git clone https://github.com/0xPlaygrounds/ryzome
cd ryzome
pnpm install
openclaw plugins install -l .
```

`-l` links the plugin directory instead of copying it, which is the better
development workflow for local iteration. OpenClaw also supports installing a
directory without linking:

```bash
openclaw plugins install .
```

See the official CLI/plugin docs for install modes and local path behavior:
[Plugins](https://docs.openclaw.ai/plugin), [CLI](https://docs.openclaw.ai/cli).

## Troubleshooting

### The plugin loads but the tool is missing

- Restart OpenClaw after installing or changing plugin config
- Run `openclaw ryzome setup` if the plugin has not been configured yet
- Check that the plugin is enabled under `plugins.entries.openclaw-ryzome.enabled`
- Run `openclaw plugins list` and `openclaw plugins info openclaw-ryzome`

### `Ryzome plugin: apiKey is required in config`

- Run `openclaw ryzome setup`, or add `plugins.entries.openclaw-ryzome.config.apiKey`
- Alternatively set `RYZOME_OPENCLAW_API_KEY` or `RYZOME_API_KEY`
- Make sure the plugin id is `openclaw-ryzome`

### Local install works, but code changes are not reflected

- Prefer `openclaw plugins install -l .` for development
- If you installed by copy instead of link, reinstall after local changes
- Restart OpenClaw after modifying plugin code

### The plugin fails with 401 or 403

- Verify the API key is valid
- Verify the key has access to the plugin-facing canvas routes
- If you are pointing at a non-production API, confirm `apiUrl` matches that environment

### The plugin fails during canvas creation or patching

The plugin surfaces which stage failed:

- `createCanvas`
- `patchCanvas`
- `patchSharingConfig`

For transient failures, the plugin retries only the post-create steps. This is
intentional: once a canvas exists, retrying patch/share calls against the same
canvas is safer than re-running the entire tool and creating a second canvas.

If failures persist:

- Verify the canvas API is reachable from the machine running OpenClaw
- Verify `apiUrl` and `appUrl` point to the same Ryzome environment
- Check whether your API deployment has the required API-key routes enabled

### The graph looks wrong or edges are missing

- Ensure every step has a unique `id`
- Ensure every `dependsOn` reference points to a valid step id
- Ensure descriptions are plain text strings
