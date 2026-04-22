---
"@ryzome-ai/ryzome-claude-plugin": patch
---

Make the Claude Code plugin installable via a custom GitHub marketplace. Renames the plugin manifest identifier to `claude-ryzome` so the install command reads self-describingly as `/plugin install claude-ryzome`. Fixes `.claude-plugin/plugin.json` to match the Claude Code plugin schema (adds `type`/`title` on `userConfig.api_key`, removes the unused `scopes` field) and aligns `plugin.json` version with `package.json`. Adds a root `.claude-plugin/marketplace.json` so users can install with `/plugin marketplace add 0xPlaygrounds/ryzome-mcp-plugins` followed by `/plugin install claude-ryzome`. Updates the README install instructions accordingly. A new `scripts/sync-claude-plugin-version.mjs` (wired into `pnpm version-packages`) keeps the manifest and marketplace entry in lockstep with the npm package version on future Changesets bumps.
