# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A pnpm monorepo providing Ryzome canvas tools for AI agents via multiple integration surfaces:

- `packages/ryzome-core` (`@ryzome-ai/ryzome-core`) — Shared logic: API client, 6 tools, graph builder, layout, canvas markdown formatter
- `packages/openclaw-ryzome` (`@ryzome-ai/openclaw-ryzome`) — OpenClaw plugin adapter (thin wrapper over core)
- `packages/ryzome-mcp` (`@ryzome-ai/ryzome-mcp`) — MCP server with tools + resources for Claude Code / any MCP client
- `packages/ryzome-claude-plugin` (`@ryzome-ai/ryzome-claude-plugin`) — Claude Code plugin (skills, agent, hooks)

Code for the full Ryzome app is under a collocated monorepo at `../ryzome-monorepo` of this repository.

## Commands

```bash
pnpm -r build              # Build all packages (core → mcp)
pnpm -r test               # Unit tests across all packages
pnpm -r --if-present typecheck  # tsc --noEmit in each package
pnpm -r --if-present lint       # biome lint + typecheck
pnpm format                # biome format --write (root)
pnpm format:check          # biome format check (CI mode)
pnpm changeset             # Create a changeset for version bumps
pnpm version-packages      # Apply changesets + sync plugin manifest
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
- `packages/ryzome-core/src/tools/` — 6 tools: `create-canvas`, `plan-canvas`, `research-canvas`, `get-canvas`, `list-canvases`, `upload-image`. Zod schemas + execute functions.

**`ryzome-mcp`** — MCP server (`packages/ryzome-mcp/src/server.ts`):

- Registers all tools from `toolRegistry`
- Static resource `ryzome://canvases` — JSON list of canvas summaries
- Dynamic resource `ryzome://canvas/{id}` — single canvas as markdown (via `ResourceTemplate` with `list` callback)

**`openclaw-ryzome`** — OpenClaw plugin adapter (`packages/openclaw-ryzome/src/index.ts`): thin wrapper registering core tools + CLI commands.

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

**Publishing** uses [Changesets](https://github.com/changesets/changesets) for independent per-package versioning:

- Each package is versioned independently — `pnpm changeset` to describe changes
- On push to main, `changesets/action` either creates a "Version Packages" PR (if pending changesets exist) or publishes stable releases (if a version PR was just merged)
- Dev snapshots are published on every main push under the `dev` npm tag when there are pending changesets
- `scripts/sync-plugin-version.mjs` keeps `openclaw.plugin.json` version in sync with the `openclaw-ryzome` package version
