---
"@ryzome-ai/openclaw-ryzome": minor
---

sdk: migrate plugin entry to `definePluginEntry` and unconditional tool registration

Rewrites `src/index.ts` to use `definePluginEntry` from `openclaw/plugin-sdk/plugin-entry`, replacing the legacy `export default function register(api)` pattern and deleting the hand-rolled `PluginApi` / `CliCommand` type stubs in favor of `OpenClawPluginApi` and `OpenClawConfig` imported directly from the focused plugin SDK subpaths.

The biggest behavioral change: tool registration is now unconditional. Previously, if the API key was missing at plugin load time, `register()` returned early and never called `api.registerTool`, which meant a "configured but dead" failure mode (plugin logged as loaded, but no tools were visible to the agent). Now all 11 Ryzome tools are registered on every load; the API key is resolved lazily inside each `execute` call, and a missing key throws a clear "run `openclaw ryzome setup`" error at invocation time. This kills the partial-install failure mode that was the closest thing to the symptom reported in RYZ-1558.

CLI (`openclaw ryzome setup|status`) now uses `OpenClawPluginApi` typing and the typed `OpenClawConfig` from the SDK instead of hand-rolled shims. Behavior and output copy are unchanged.
