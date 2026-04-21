---
"@ryzome-ai/canvas-layout-ts": minor
---

Add `rectpacking` layout algorithm alongside the existing `layered` flow. Configurable at the root (`LayoutOptions.algorithm`, `LayoutOptions.aspectRatio`) and per-group (`LayoutGroupInput.algorithm`, `LayoutGroupInput.aspectRatio`). Groups whose algorithm or direction differs from the root are isolated via `SEPARATE_CHILDREN` so the override actually applies.
