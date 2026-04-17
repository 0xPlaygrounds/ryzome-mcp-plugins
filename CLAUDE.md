# AGENTS.md

This file provides guidance to coding agents working in this repository (Claude Code, Cursor, Codex, and other tools that honor `AGENTS.md`).

## What This Is

A pnpm monorepo providing Ryzome canvas tools for AI agents via multiple integration surfaces:

- `packages/ryzome-core` (`@ryzome-ai/ryzome-core`) — Shared logic: API client, 11 tools, graph builder, layout, canvas markdown formatter
- `packages/openclaw-ryzome` (`@ryzome-ai/openclaw-ryzome`) — OpenClaw plugin adapter (thin wrapper over core)
- `packages/hermes-ryzome` (`@ryzome-ai/hermes-ryzome`) — Hermes plugin adapter (Python plugin surface + Node runner over core)
- `packages/ryzome-mcp` (`@ryzome-ai/ryzome-mcp`) — MCP server with tools + resources for Claude Code / any MCP client
- `packages/ryzome-claude-plugin` (`@ryzome-ai/ryzome-claude-plugin`) — Claude Code plugin (skills, agent, hooks)

Code for the full Ryzome app is under a collocated monorepo at `../ryzome-monorepo` of this repository.

## Commands

```bash
pnpm -r build              # Build all packages
pnpm -r test               # Unit tests across all packages
pnpm -r --if-present typecheck  # tsc --noEmit in each package
pnpm -r --if-present lint       # biome lint + typecheck
pnpm format                # biome format --write (root)
pnpm format:check          # biome format check (CI mode)
pnpm changeset             # Create a changeset for version bumps
pnpm version-packages      # Apply changesets + sync adapter metadata
pnpm release               # Build + publish all changed packages

# Per-package
pnpm --filter @ryzome-ai/ryzome-core test
pnpm --filter @ryzome-ai/ryzome-mcp test
pnpm --filter @ryzome-ai/ryzome-core test -- --testPathPattern=layout
```

Integration tests hit the live Ryzome API and are gated by env vars: `RYZOME_ENABLE_LIVE_SMOKE`, `RYZOME_LIVE_SMOKE_API_KEY`, `RYZOME_LIVE_SMOKE_API_URL`.

## Architecture

**`ryzome-core`** — shared logic, all other packages depend on this:

- `packages/ryzome-core/src/config.ts` — Resolves config from env vars (`RYZOME_OPENCLAW_API_KEY`, `RYZOME_API_KEY`, `PLUGIN_USER_CONFIG_API_KEY`). Supports `${ENV_VAR}` syntax.
- `packages/ryzome-core/src/lib/ryzome-client.ts` — `openapi-fetch`-based API client. `RyzomeApiError` marks 408/429/5xx as retryable.
- `packages/ryzome-core/src/lib/graph-builder.ts` — Converts tool steps into `createNode`/`createEdge`/`setNodeColor` patch operations. Supports node coloring and group containers. DAG depths via BFS.
- `packages/ryzome-core/src/lib/layout.ts` — Positions nodes by depth level (320px wide, 80px H / 60px V gaps).
- `packages/ryzome-core/src/lib/canvas-executor.ts` — Orchestrates create → build graph → patch → return URL.
- `packages/ryzome-core/src/lib/format-canvas-markdown.ts` — Converts `CanvasEditorView` to LLM-readable markdown. Used by MCP resources.
- `packages/ryzome-core/src/lib/retry.ts` — Max 2 retries with exponential backoff (250ms base).
- `packages/ryzome-core/src/tools/` — 11 tools spanning canvas creation, document CRUD, library promotion, and image upload. Zod schemas + execute functions.

**`ryzome-mcp`** — MCP server (`packages/ryzome-mcp/src/server.ts`):

- Registers all tools from `toolRegistry`
- Static resources `ryzome://canvases` and `ryzome://documents` — JSON list of canvas / document summaries
- Dynamic resources `ryzome://canvas/{id}` and `ryzome://document/{id}` — single canvas / document as markdown (via `ResourceTemplate` with `list` callback)
- Advertised MCP server version is read from `packages/ryzome-mcp/package.json` at startup

**`openclaw-ryzome`** — OpenClaw plugin adapter (`packages/openclaw-ryzome/src/index.ts`): thin wrapper registering core tools + CLI commands.

Onboarding invariants (to avoid re-debugging the same phantom):

- Entry uses `definePluginEntry` from `openclaw/plugin-sdk/plugin-entry`; no hand-rolled `PluginApi` type.
- Tools register **unconditionally** regardless of whether the API key is set. The api-key check is lazy: each tool's `execute` resolves config at call time and throws a setup-hint error if missing. Do not reintroduce an early return in `register()` — that's what made the plugin appear "broken" with no tools visible.
- The manifest declares `contracts.tools` (all 11 tool names) and `activation.onCommands: ["ryzome"]`. `contracts.tools` is what makes OpenClaw auto-allowlist `openclaw-ryzome` into `plugins.allow` once a config entry exists — agents should **not** "fix" missing tools by writing to `plugins.allow` from the plugin CLI.
- Onboarding path is `openclaw ryzome setup --key <api-key>` (and `openclaw ryzome status` to verify). The global `openclaw setup` wizard does not have a tool-plugin step today; upstream request tracked at [openclaw/openclaw#68115](https://github.com/openclaw/openclaw/issues/68115).

**`hermes-ryzome`** — Hermes plugin adapter (`packages/hermes-ryzome`): Python `register(ctx)` plugin surface plus a Node runner that executes the same `toolRegistry` entries as OpenClaw.

**`ryzome-claude-plugin`** — Claude Code plugin (no build step): `.claude-plugin/plugin.json` manifest, `.mcp.json` bundled server, skills (`/plan`, `/research`, `/ryzome-status`), `ryzome-context` agent.

**Data flow for canvas creation:**
```
Tool params → Zod validation → canvas-executor
  → RyzomeClient.createCanvas()
  → graph-builder → layout → RyzomeClient.patchCanvas()
  → returns viewer URL + stats
```

**Tool return format:** All tools return `{ content: [{ type: "text", text: string }] }`.

## Tech Stack

- **Runtime:** Node, ESM (`"type": "module"`)
- **Package manager:** pnpm 10.31.0
- **Monorepo:** pnpm workspaces (`packages/*`)
- **Linting/formatting:** Biome (no ESLint or Prettier)
- **Testing:** Vitest with globals enabled
- **Schema:** Zod v4 (single source of truth); `z.toJSONSchema()` for JSON Schema generation
- **API client:** openapi-fetch with generated types in `packages/ryzome-core/src/lib/client/schema.d.ts`
- **MCP SDK:** `@modelcontextprotocol/sdk` for tools + resources in `ryzome-mcp`

## Adding New Canvas Operations

`packages/ryzome-core/src/lib/client/index.ts` defines `PatchOperation` as a narrowed `Extract<>` of the full `Operation` union from `schema.d.ts`. It only includes the operation types the plugin actually uses. When adding a new canvas capability (e.g. a new patch operation type), widen this type first — downstream code won't compile until you do.

`schema.d.ts` is auto-generated from the backend OpenAPI spec (`cargo run -p canvas-routes --bin generate-openapi` in the monorepo). When the backend has a route the spec hasn't been regenerated for, you can manually add paths/types with a `NOTE: Manually added — regenerate later` comment. Run `pnpm codegen:all` in the monorepo to regenerate all client specs.

## CI

GitHub Actions runs lint, typecheck, and tests on every push to main and on PRs. Live smoke tests run as a separate gated job.

## Changeset Discipline

- Any PR with release-relevant changes under `packages/` should include a changeset file created with `pnpm changeset`.
- Treat code, config, manifest, or shipped asset changes in published packages as release-relevant by default. Pure test-only changes and Markdown-only documentation edits do not need a changeset.
- Do not leave changeset creation for later in the flow. Add or update the changeset in the same PR as the package change so CI can enforce it.

**Publishing** uses [Changesets](https://github.com/changesets/changesets) for independent per-package versioning:

- Each package is versioned independently — `pnpm changeset` to describe changes
- On push to main, `changesets/action` either creates a "Version Packages" PR (if pending changesets exist) or publishes stable releases (if a version PR was just merged)
- Dev snapshots are published on every main push under the `dev` npm tag when there are pending changesets
- `scripts/sync-plugin-version.mjs` keeps `openclaw.plugin.json` version in sync with the `openclaw-ryzome` package version
- `scripts/sync-hermes-plugin-version.mjs` keeps `packages/hermes-ryzome/plugin.yaml`, `pyproject.toml`, and `__version__` in sync with the `hermes-ryzome` package version
