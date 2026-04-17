# @ryzome-ai/openclaw-ryzome

## 0.5.0

### Minor Changes

- 1c431e6: sdk: migrate plugin entry to `definePluginEntry` and unconditional tool registration

  Rewrites `src/index.ts` to use `definePluginEntry` from `openclaw/plugin-sdk/plugin-entry`, replacing the legacy `export default function register(api)` pattern and deleting the hand-rolled `PluginApi` / `CliCommand` type stubs in favor of `OpenClawPluginApi` and `OpenClawConfig` imported directly from the focused plugin SDK subpaths.

  The biggest behavioral change: tool registration is now unconditional. Previously, if the API key was missing at plugin load time, `register()` returned early and never called `api.registerTool`, which meant a "configured but dead" failure mode (plugin logged as loaded, but no tools were visible to the agent). Now all 11 Ryzome tools are registered on every load; the API key is resolved lazily inside each `execute` call, and a missing key throws a clear "run `openclaw ryzome setup`" error at invocation time. This kills the partial-install failure mode that was the closest thing to the symptom reported in RYZ-1558.

  CLI (`openclaw ryzome setup|status`) now uses `OpenClawPluginApi` typing and the typed `OpenClawConfig` from the SDK instead of hand-rolled shims. Behavior and output copy are unchanged.

### Patch Changes

- 1c431e6: manifest: declare tool contracts and onCommand activation

  Adds `contracts.tools` listing all 11 Ryzome tool names, `activation.onCommands: ["ryzome"]`, and `openclaw.compat` / `openclaw.build` metadata to the plugin manifest and `package.json`.

  Declaring `contracts.tools` lets OpenClaw's built-in `materializeConfiguredPluginEntryAllowlist` auto-add `openclaw-ryzome` to `plugins.allow` whenever the user has material plugin config (e.g. an API key), which fixes the self-healing onboarding path for operators who have already populated an allowlist. `activation.onCommands` lets the plugin be loaded lazily when a `ryzome` subcommand is invoked. The `compat` / `build` metadata documents the OpenClaw runtime versions we target so ClawHub can validate compatibility at install time.

  No runtime or CLI behavior changes.

- Updated dependencies [ba13c7d]
- Updated dependencies [d0c8867]
  - @ryzome-ai/ryzome-core@0.2.3

## 0.4.2

### Patch Changes

- 2c39852: Internal cleanup and code quality pass across the plugin monorepo.

  - `ryzome-core`: tighten `RyzomeClient.getCanvas` / `listCanvases` return types and drop redundant `try/catch` wrappers in tool executors so `RyzomeApiError` propagates directly.
  - `ryzome-mcp`: advertise the server version from `package.json` (no more hardcoded `0.2.0`), share a `resourceIdToString` helper, and clean up stale inline comments.
  - `openclaw-ryzome`: move `@sinclair/typebox` to `devDependencies` (it is only used for type generation at build time) and sync README tool/command tables with the current tool surface.

- Updated dependencies [2c39852]
  - @ryzome-ai/ryzome-core@0.2.2

## 0.4.1

### Patch Changes

- Updated dependencies [2e42f57]
  - @ryzome-ai/ryzome-core@0.2.1

## 0.4.0

### Minor Changes

- 2925ea2: Add document create, update, list, and save-to-library support across the plugin and MCP surfaces. Normalize canvas and document workspace URLs so clients open the correct views.

### Patch Changes

- Updated dependencies [2925ea2]
  - @ryzome-ai/ryzome-core@0.2.0

## 0.3.2

### Patch Changes

- 9e348db: Fix documentation drift in sub-package READMEs and remove stale upload_ryzome_image unavailability guard now that the backend supports API key auth on the file-upload route.
- Updated dependencies [9e348db]
  - @ryzome-ai/ryzome-core@0.1.1
