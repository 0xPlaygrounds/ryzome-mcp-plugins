---
"@ryzome-ai/ryzome-core": patch
"@ryzome-ai/ryzome-mcp": patch
"@ryzome-ai/openclaw-ryzome": patch
---

Internal cleanup and code quality pass across the plugin monorepo.

- `ryzome-core`: tighten `RyzomeClient.getCanvas` / `listCanvases` return types and drop redundant `try/catch` wrappers in tool executors so `RyzomeApiError` propagates directly.
- `ryzome-mcp`: advertise the server version from `package.json` (no more hardcoded `0.2.0`), share a `resourceIdToString` helper, and clean up stale inline comments.
- `openclaw-ryzome`: move `@sinclair/typebox` to `devDependencies` (it is only used for type generation at build time) and sync README tool/command tables with the current tool surface.
