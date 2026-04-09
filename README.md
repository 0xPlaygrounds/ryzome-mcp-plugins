![claw-ryzome](https://github.com/user-attachments/assets/822727dc-dcd6-4af1-bc81-856a4e9a521f)

# Ryzome MCP Plugins

Ryzome lets AI agents externalize their working context (plans, research, reasoning) as interactive canvases. Users can inspect the agent's state, correct it, and hand the corrected graph back for the agent to continue from.

This monorepo provides Ryzome canvas tools for AI agents across multiple integration surfaces.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@ryzome-ai/ryzome-core`](packages/ryzome-core) | Shared logic: API client, tools, graph builder, layout | [![npm](https://img.shields.io/npm/v/@ryzome-ai/ryzome-core)](https://www.npmjs.com/package/@ryzome-ai/ryzome-core) |
| [`@ryzome-ai/ryzome-mcp`](packages/ryzome-mcp) | MCP server with tools + resources for Claude Code and other MCP clients | [![npm](https://img.shields.io/npm/v/@ryzome-ai/ryzome-mcp)](https://www.npmjs.com/package/@ryzome-ai/ryzome-mcp) |
| [`@ryzome-ai/openclaw-ryzome`](packages/openclaw-ryzome) | OpenClaw plugin adapter | [![npm](https://img.shields.io/npm/v/@ryzome-ai/openclaw-ryzome)](https://www.npmjs.com/package/@ryzome-ai/openclaw-ryzome) |
| [`@ryzome-ai/ryzome-claude-plugin`](packages/ryzome-claude-plugin) | Claude Code plugin with skills, agents, and hooks | [![npm](https://img.shields.io/npm/v/@ryzome-ai/ryzome-claude-plugin)](https://www.npmjs.com/package/@ryzome-ai/ryzome-claude-plugin) |

## Architecture

```
ryzome-claude-plugin (Claude Code plugin)
  └── ryzome-mcp (MCP server)
        └── ryzome-core (shared logic)

openclaw-ryzome (OpenClaw plugin)
  └── ryzome-core (shared logic)
```

`ryzome-core` contains the API client, 6 canvas tools, graph builder, layout engine, and markdown formatter. The MCP server and OpenClaw plugin are thin adapters that register those tools into their respective frameworks.

## Getting Started

- **Claude Code users**: See [`@ryzome-ai/ryzome-claude-plugin`](packages/ryzome-claude-plugin) for one-command install
- **MCP client users**: See [`@ryzome-ai/ryzome-mcp`](packages/ryzome-mcp) for `npx` quick start
- **OpenClaw users**: See [`@ryzome-ai/openclaw-ryzome`](packages/openclaw-ryzome) for plugin install
- **Building integrations**: See [`@ryzome-ai/ryzome-core`](packages/ryzome-core) for the shared library

## Development

```bash
pnpm install                        # Install all dependencies
pnpm build                          # Build all packages (core -> mcp)
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

## License

MIT
