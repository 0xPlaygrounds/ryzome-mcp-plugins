# @ryzome-ai/canvas-layout-ts

## 0.3.0

### Minor Changes

- bce4c87: Add `rectpacking` layout algorithm alongside the existing `layered` flow. Configurable at the root (`LayoutOptions.algorithm`, `LayoutOptions.aspectRatio`) and per-group (`LayoutGroupInput.algorithm`, `LayoutGroupInput.aspectRatio`). Groups whose algorithm or direction differs from the root are isolated via `SEPARATE_CHILDREN` so the override actually applies.

## 0.1.0

### Minor Changes

- ba13c7d: feat(canvas-layout-ts): new compound-graph layout package powered by elkjs

  Introduces `@ryzome-ai/canvas-layout-ts`, a framework-free TypeScript package that wraps ELK's `layered` algorithm to place canvas nodes, edges, and groups. Groups are modeled as ELK compound parents so members stay spatially clustered instead of being bounded by a post-hoc rectangle, and cycles / disconnected components are handled by ELK without caller intervention.

  ### `@ryzome-ai/canvas-layout-ts` (new package)

  Public API:

  - `computeCanvasLayout(input, options?)` — async. Takes `{ nodes, edges?, groups? }` and returns `{ nodes, groups }` keyed by id, each a `{ x, y, width, height }` rect in canvas-absolute coordinates.
  - Input edges may be passed directly via `input.edges` or implicitly via each node's `dependsOn`; both are unioned and references to unknown nodes are silently dropped (parity with the prior `buildCanvasGraph` behavior).
  - `LayoutOptions`:
    - `measureNode(node)` — pluggable width/height resolver. When omitted, falls back to the caller-supplied `width`/`height` on the node or the `320x180` default. Callers can pass real rendered sizes (DOM-measured) to feed ELK accurate dimensions.
    - `direction` — `"DOWN" | "RIGHT" | "UP" | "LEFT"` (default `"DOWN"`).
    - `spacing.{nodeNode, nodeNodeBetweenLayers, edgeNode}` — override ELK spacing keys. Defaults `80 / 60 / 40` match the previous visual rhythm.
    - `groupPadding` — default `40` (with `60` on top for the group label).
  - ELK root is configured with `elk.separateConnectedComponents: true` so disconnected subgraphs are placed side-by-side instead of overlapping at the origin, and `elk.hierarchyHandling: INCLUDE_CHILDREN` so edges crossing group boundaries are routed correctly.

  ### `@ryzome-ai/ryzome-core` (rewire)

  - `buildCanvasGraph` is now `async` and delegates all positioning to `computeCanvasLayout`. Its only caller, `canvas-executor.ts`, now awaits it. `buildCanvasGraph` is not exported from the package root (`src/index.ts`), so this is not a public-API break — consumers of `ryzome-core` see no change.
  - MCP tool schemas are unchanged. Agents continue to pass `nodes`/`dependsOn`/`groups` with no x/y; all three creation tools (`create_ryzome_canvas`, `create_ryzome_plan`, `create_ryzome_research`) automatically benefit via the shared `canvas-executor` path.
  - The old depth-grid heuristic (`computeLayout` / `computeGroupBounds`) is removed from the primary path. `estimateNodeHeight` is retained and used as the default `measureNode` so visual density matches the previous output until real-measurement is wired in.
  - A `RYZOME_LAYOUT_ENGINE=legacy` env flag reinstates the former depth-grid placement via the preserved `computeLegacyLayoutRects` for emergency rollback. Intended as a short-lived safety valve — remove once the elk path has been exercised in production.
  - Coordinate-based tests are replaced with invariant-based tests (no overlap, groups contain members, layer ordering), plus smoke fixtures for 50-node DAGs, multi-group research canvases, disconnected roots, and cycles.
