# AGENTS.md

This repository is the standalone Hermes install surface for the Ryzome plugin.

## What this repo is for

- Standard Hermes install flow: `hermes plugins install 0xPlaygrounds/hermes-ryzome-plugin --enable`
- PyPI package source for `hermes-ryzome-plugin`
- Bundled runtime asset for git installs: `ryzome_hermes_plugin/_runner.js`

The broader multi-surface Ryzome integrations live in the monorepo at `../ryzome-mcp-plugins`.

## Key files

- `plugin.yaml` — Hermes plugin manifest at the repo root
- `__init__.py` — root shim exporting `register`
- `ryzome_hermes_plugin/` — Python plugin package loaded by Hermes
- `ryzome_hermes_plugin/_runner.js` — bundled Node runner checked into git on purpose so `hermes plugins install` works without a build step
- `src/runner.ts` — TypeScript source for the bundled runner
- `src/generate-tool-manifest.ts` — regenerates `ryzome_hermes_plugin/tool_manifest.json`

## Commands

```bash
pnpm install
pnpm build
pnpm test
```

## Invariants

- Keep `plugin.yaml` at the repo root. Hermes git installs expect the manifest there.
- Keep `__init__.py` at the repo root. Hermes directory loading imports the repo root as the plugin package.
- Keep `ryzome_hermes_plugin/_runner.js` committed. The standalone repo must work via `hermes plugins install` without asking users to build anything.
- If `src/runner.ts` changes, run `pnpm build` and commit the refreshed `ryzome_hermes_plugin/_runner.js`.
- `@ryzome-ai/ryzome-core` resolves from npm in this standalone repo. Do not switch it back to `workspace:*` here.
- Hermes-native auth for general plugins is `requires_env` in `plugin.yaml`, which `hermes plugins install` prompts for and saves to `~/.hermes/.env`.
- Do not rely on `ctx.register_cli_command()` for user-facing setup. In practice, Hermes general plugins should prefer tools plus optional slash commands.
- This plugin exposes `/ryzome-status` for diagnostics and uses `RYZOME_API_KEY` / `~/.hermes/ryzome.json` for configuration.