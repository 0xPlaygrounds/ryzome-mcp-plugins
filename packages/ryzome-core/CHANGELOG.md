# @ryzome-ai/ryzome-core

## 0.2.4

### Patch Changes

- Updated dependencies [bce4c87]
  - @ryzome-ai/canvas-layout-ts@0.3.0

## 0.2.3

### Patch Changes

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

- d0c8867: fix(upload-image): use SHA-256 content hash as S3 key

  The `upload_ryzome_image` tool previously generated S3 keys of the form
  `canvas/{canvas_id}/images/{uuid}.{ext}`, which diverged from the canvas
  app convention (`apps/canvas/src/lib/s3/s3-client.ts` → `createFileHash`)
  where the S3 key is the SHA-256 hex digest of the file contents.
  Downstream features (share/publish/clone, file deduplication, workspace
  size accounting) rely on that convention, so images uploaded via the
  plugin were not correctly handled by those flows. The tool now produces
  the same hash-based key as the rest of the product.

- Updated dependencies [ba13c7d]
  - @ryzome-ai/canvas-layout-ts@0.1.0

## 0.2.2

### Patch Changes

- 2c39852: Internal cleanup and code quality pass across the plugin monorepo.

  - `ryzome-core`: tighten `RyzomeClient.getCanvas` / `listCanvases` return types and drop redundant `try/catch` wrappers in tool executors so `RyzomeApiError` propagates directly.
  - `ryzome-mcp`: advertise the server version from `package.json` (no more hardcoded `0.2.0`), share a `resourceIdToString` helper, and clean up stale inline comments.
  - `openclaw-ryzome`: move `@sinclair/typebox` to `devDependencies` (it is only used for type generation at build time) and sync README tool/command tables with the current tool surface.

## 0.2.1

### Patch Changes

- 2e42f57: Fix canvas creation to send explicit Canvas content through the document API and reject non-canvas responses before returning a canvas URL.

## 0.2.0

### Minor Changes

- 2925ea2: Add document create, update, list, and save-to-library support across the plugin and MCP surfaces. Normalize canvas and document workspace URLs so clients open the correct views.

## 0.1.1

### Patch Changes

- 9e348db: Fix documentation drift in sub-package READMEs and remove stale upload_ryzome_image unavailability guard now that the backend supports API key auth on the file-upload route.
