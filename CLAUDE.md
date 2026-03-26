# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An OpenClaw plugin (`@ryzome-ai/openclaw-ryzome`) that lets an AI agent externalize its working context (plans, research, reasoning) as interactive Ryzome canvases. Users can then inspect, edit, and hand the corrected graph back to the agent.

Code for the full Ryzome app is under a collocated monorepo at `../ryzome-monorepo` of this repository.

## Commands

```bash
pnpm test                  # Unit tests (vitest)
pnpm test:integration      # Integration tests (requires RYZOME_ENABLE_LIVE_SMOKE=true + API key)
pnpm test -- --testPathPattern=layout  # Run a single test file by name
pnpm typecheck             # tsc --noEmit
pnpm lint                  # biome lint + typecheck
pnpm lint:check            # biome lint strict (CI mode)
pnpm format                # biome format --write
pnpm format:check          # biome format check (CI mode)
```

Integration tests hit the live Ryzome API and are gated by env vars: `RYZOME_ENABLE_LIVE_SMOKE`, `RYZOME_LIVE_SMOKE_API_KEY`, `RYZOME_LIVE_SMOKE_API_URL`.

## Architecture

**Plugin entry point:** `src/index.ts` — default export `register(api)` receives the OpenClaw plugin API, parses config, and registers 4 tools + CLI commands.

**Data flow for canvas creation:**
```
Tool params → Zod validation → canvas-executor
  → RyzomeClient.createCanvas()
  → graph-builder (converts steps to DAG patch operations, assigns ObjectIds)
  → layout (positions nodes by DAG depth: 320px wide, 80px horizontal / 60px vertical gaps)
  → RyzomeClient.patchCanvas()
  → returns viewer URL + stats
```

**Key modules:**

- `src/config.ts` — Resolves config from plugin config object or env vars (`RYZOME_OPENCLAW_API_KEY`, `RYZOME_API_KEY`). Supports `${ENV_VAR}` syntax in config values.
- `src/cli.ts` — `openclaw ryzome setup` (interactive key setup) and `openclaw ryzome status`.
- `src/lib/ryzome-client.ts` — `openapi-fetch`-based API client with middleware pipeline. `RyzomeApiError` marks 408/429/5xx as retryable.
- `src/lib/graph-builder.ts` — Converts tool steps into `createNode`/`createEdge` patch operations. Computes DAG depths via BFS for layout.
- `src/lib/layout.ts` — Positions nodes on canvas by depth level (horizontal grouping per depth, vertical stacking across depths).
- `src/lib/canvas-executor.ts` — Orchestrates create → build graph → patch → return URL.
- `src/lib/retry.ts` — Max 2 retries with exponential backoff (250ms base), only for retryable errors.
- `src/tools/` — Each file defines a Typebox schema (for agent-facing params) + Zod validation + execute function. Tools: `create-canvas`, `plan-canvas`, `research-canvas`, `get-canvas`.

**Tool return format:** All tools return `{ content: [{ type: "text", text: string }] }`.

## Tech Stack

- **Runtime:** Node, ESM (`"type": "module"`)
- **Package manager:** pnpm 10.31.0
- **Linting/formatting:** Biome (no ESLint or Prettier)
- **Testing:** Vitest with globals enabled
- **Schema:** Typebox for JSON schema generation (agent-facing), Zod for runtime validation
- **API client:** openapi-fetch with generated types in `src/lib/client/schema.d.ts`

## CI

GitHub Actions runs lint, typecheck, and tests on every push to main and on PRs. Publishing happens via `publish.yml` — dev tags on main push, stable releases on GitHub release events. Live smoke tests run as a separate gated job.
