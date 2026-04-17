# @ryzome-ai/canvas-layout-ts

Compound-graph layout for Ryzome canvases. Wraps [`elkjs`](https://github.com/kieler/elkjs) with a small pure-async API so the same implementation runs inside MCP plugins (Node) and inside the canvas web app (Web Worker).

## Install

```bash
pnpm add @ryzome-ai/canvas-layout-ts
```

## Usage

```ts
import { computeCanvasLayout } from "@ryzome-ai/canvas-layout-ts";

const result = await computeCanvasLayout({
  nodes: [
    { id: "a", group: "g1" },
    { id: "b", group: "g1", dependsOn: ["a"] },
    { id: "c", dependsOn: ["a"] },
  ],
  edges: [
    { from: "a", to: "b" },
    { from: "a", to: "c" },
  ],
  groups: [{ id: "g1", title: "Phase 1" }],
});

// result.nodes["a"] => { x, y, width, height }
// result.groups["g1"] => { x, y, width, height } (bounding box of members)
```

### Custom measurement

By default every node is assumed to be 320×180. Pass `measureNode` to override:

```ts
await computeCanvasLayout(input, {
  measureNode: (node) => ({ width: 320, height: estimateFromDescription(node) }),
});
```

In the web app, pass real rendered dimensions read from the React-Flow store.

## Algorithm

Uses ELK's `layered` algorithm (Sugiyama-style) with top-down direction. Groups are modeled as ELK compound nodes — members stay spatially clustered and the group frame becomes the ELK parent bounding box. Edges influence layer assignment and horizontal ordering; cycles are broken by ELK automatically.

## License

MIT
