---
"@ryzome-ai/canvas-layout-ts": patch
"@ryzome-ai/ryzome-core": patch
"@ryzome-ai/ryzome-mcp": patch
"@ryzome-ai/openclaw-ryzome": minor
"@ryzome-ai/hermes-ryzome": patch
---

Update package dependencies and move the workspace to pnpm 12. Build the
OpenClaw plugin as JavaScript for current OpenClaw releases, and use its new
config mutation API. Regenerate the bundled Hermes tool manifest with the
updated Zod schema output.
