![claw-ryzome](https://github.com/user-attachments/assets/822727dc-dcd6-4af1-bc81-856a4e9a521f)

# Ryzome MCP Plugins

Ryzome lets AI agents externalize their working context (plans, research, reasoning) as interactive canvases. Users can inspect the agent's state, correct it, and hand the corrected graph back for the agent to continue from.

This monorepo provides Ryzome canvas tools for AI agents across multiple integration surfaces.

## Packages

| Package | Description | Registry |
|---------|-------------|----------|
| [`@ryzome-ai/ryzome-core`](packages/ryzome-core) | Shared logic: API client, 11 tools, graph builder, layout | [![npm](https://img.shields.io/npm/v/@ryzome-ai/ryzome-core)](https://www.npmjs.com/package/@ryzome-ai/ryzome-core) |
| [`@ryzome-ai/ryzome-mcp`](packages/ryzome-mcp) | MCP server with tools + resources for Claude Code and other MCP clients | [![npm](https://img.shields.io/npm/v/@ryzome-ai/ryzome-mcp)](https://www.npmjs.com/package/@ryzome-ai/ryzome-mcp) |
| [`@ryzome-ai/openclaw-ryzome`](packages/openclaw-ryzome) | OpenClaw plugin adapter | [![npm](https://img.shields.io/npm/v/@ryzome-ai/openclaw-ryzome)](https://www.npmjs.com/package/@ryzome-ai/openclaw-ryzome) |
| [`hermes-ryzome-plugin`](packages/hermes-ryzome) | Hermes Agent plugin source package. Standard Hermes install repo: [`0xPlaygrounds/hermes-ryzome-plugin`](https://github.com/0xPlaygrounds/hermes-ryzome-plugin) | [![PyPI](https://img.shields.io/pypi/v/hermes-ryzome-plugin)](https://pypi.org/project/hermes-ryzome-plugin/) |
| [`@ryzome-ai/ryzome-claude-plugin`](packages/ryzome-claude-plugin) | Claude Code plugin with skills, agents, and hooks | [![npm](https://img.shields.io/npm/v/@ryzome-ai/ryzome-claude-plugin)](https://www.npmjs.com/package/@ryzome-ai/ryzome-claude-plugin) |

## Architecture

```
ryzome-claude-plugin (Claude Code plugin)
  └── ryzome-mcp (MCP server)
        └── ryzome-core (shared logic)

openclaw-ryzome (OpenClaw plugin)
  └── ryzome-core (shared logic)

hermes-ryzome (Hermes plugin)
  ├── Python Hermes plugin surface
  └── ryzome-core (shared logic via Node runner)
```

`ryzome-core` contains the API client, 11 tools, graph builder, layout engine, and markdown formatter. The MCP server, OpenClaw plugin, and Hermes plugin all reuse that shared tool implementation.

## Getting Started

- **Claude Code users**: See [`@ryzome-ai/ryzome-claude-plugin`](packages/ryzome-claude-plugin) for one-command install
- **MCP client users**: See [`@ryzome-ai/ryzome-mcp`](packages/ryzome-mcp) for `npx` quick start
- **OpenClaw users**: See [`@ryzome-ai/openclaw-ryzome`](packages/openclaw-ryzome) for plugin install
- **Hermes users**: Install the standalone repo with `hermes plugins install 0xPlaygrounds/hermes-ryzome-plugin --enable`. Hermes prompts for `RYZOME_API_KEY` during install and saves it to `~/.hermes/.env`.
- **Building integrations**: See [`@ryzome-ai/ryzome-core`](packages/ryzome-core) for the shared library

### Hermes Plugin

Standard Hermes install path:

```bash
hermes plugins install 0xPlaygrounds/hermes-ryzome-plugin --enable
```

Hermes prompts for `RYZOME_API_KEY` during install because the plugin declares it in `plugin.yaml` via `requires_env`. The value is saved to `~/.hermes/.env`.

Inside a Hermes session, the plugin exposes `/ryzome-status` for diagnostics.

The standalone install repo exists because Hermes git installs expect `plugin.yaml` and `__init__.py` at the repository root. The broader shared development surface remains in this monorepo under [`packages/hermes-ryzome`](packages/hermes-ryzome).

For local development from this monorepo:

```bash
pnpm build
ln -s "$PWD/packages/hermes-ryzome" ~/.hermes/plugins/ryzome
export RYZOME_API_KEY=rz_...
```

The Python wheel bundles the Node runner (`_runner.js`) alongside the plugin, so public installs only need Node.js on `PATH`. To override the runner command, set `RYZOME_HERMES_RUNNER`.

## Development

```bash
pnpm install                        # Install all dependencies
pnpm build                          # Build all packages
pnpm test                           # Run unit tests across all packages
pnpm typecheck                      # tsc --noEmit in each package
pnpm lint                           # Biome lint + typecheck
pnpm format                         # Biome format --write
```

### Per-package commands

```bash
pnpm --filter @ryzome-ai/ryzome-core test
pnpm --filter @ryzome-ai/ryzome-mcp test
pnpm --filter @ryzome-ai/ryzome-core test -- --testPathPattern=layout
```

## Contributing

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing. Each package is versioned independently.

1. Make your changes
2. Run `pnpm changeset` to describe what changed and which packages are affected
3. Commit the changeset file with your PR
4. When the PR merges, a "Version Packages" PR is automatically created
5. Merging that PR bumps versions, updates changelogs, and publishes to npm

Dev snapshots are published on every push to `main` under the `dev` tag.

The Hermes plugin is a Python package published to PyPI as `hermes-ryzome-plugin` via the manual `Publish Hermes Python Plugin` workflow. The wheel bundles the compiled Node runner produced by `pnpm --filter @ryzome-ai/hermes-ryzome build`, so it is not published to npm. Changesets still version-bumps it so the `package.json` / `pyproject.toml` / `plugin.yaml` versions stay in sync.

## License

MIT
