---
"@ryzome-ai/openclaw-ryzome": patch
---

manifest: declare tool contracts and onCommand activation

Adds `contracts.tools` listing all 11 Ryzome tool names, `activation.onCommands: ["ryzome"]`, and `openclaw.compat` / `openclaw.build` metadata to the plugin manifest and `package.json`.

Declaring `contracts.tools` lets OpenClaw's built-in `materializeConfiguredPluginEntryAllowlist` auto-add `openclaw-ryzome` to `plugins.allow` whenever the user has material plugin config (e.g. an API key), which fixes the self-healing onboarding path for operators who have already populated an allowlist. `activation.onCommands` lets the plugin be loaded lazily when a `ryzome` subcommand is invoked. The `compat` / `build` metadata documents the OpenClaw runtime versions we target so ClawHub can validate compatibility at install time.

No runtime or CLI behavior changes.
