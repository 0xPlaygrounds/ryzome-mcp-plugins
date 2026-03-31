export interface LayoutNode {
  id: string;
  depth: number;
}

export interface LayoutPosition {
  x: number;
  y: number;
}

const NODE_WIDTH = 320;
const NODE_GAP_X = 80;
const NODE_GAP_Y = 60;
const BASE_NODE_HEIGHT = 180;
const CHAR_HEIGHT_FACTOR = 0.3;

export function estimateNodeHeight(description: string): number {
  const lineCount = Math.ceil(description.length / 40);
  return Math.max(BASE_NODE_HEIGHT, BASE_NODE_HEIGHT + lineCount * CHAR_HEIGHT_FACTOR * 10);
}

/**
 * Assigns (x, y) positions to nodes based on their depth in a DAG.
 * Nodes at the same depth level are spread horizontally.
 * Depth levels stack vertically.
 */
export function computeLayout(nodes: LayoutNode[]): Map<string, LayoutPosition> {
  const byDepth = new Map<number, LayoutNode[]>();
  for (const node of nodes) {
    const group = byDepth.get(node.depth) ?? [];
    group.push(node);
    byDepth.set(node.depth, group);
  }

  const positions = new Map<string, LayoutPosition>();
  const maxDepth = Math.max(...byDepth.keys(), 0);

  let cumulativeY = 0;

  for (let depth = 0; depth <= maxDepth; depth++) {
    const group = byDepth.get(depth) ?? [];
    const totalWidth = group.length * NODE_WIDTH + (group.length - 1) * NODE_GAP_X;
    const startX = -totalWidth / 2;

    for (let i = 0; i < group.length; i++) {
      positions.set(group[i].id, {
        x: startX + i * (NODE_WIDTH + NODE_GAP_X),
        y: cumulativeY,
      });
    }

    cumulativeY += BASE_NODE_HEIGHT + NODE_GAP_Y;
  }

  return positions;
}

export interface GroupPadding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_GROUP_PADDING: Required<GroupPadding> = {
  top: 60,
  right: 40,
  bottom: 40,
  left: 40,
};

/**
 * Computes a bounding box that encloses all child nodes with padding.
 * Returns null if there are no children.
 */
export function computeGroupBounds(
  children: Array<{ x: number; y: number; width: number; height: number }>,
  padding?: GroupPadding,
): BoundingBox | null {
  if (children.length === 0) return null;

  const pad = { ...DEFAULT_GROUP_PADDING, ...padding };

  const minX = Math.min(...children.map((c) => c.x));
  const minY = Math.min(...children.map((c) => c.y));
  const maxX = Math.max(...children.map((c) => c.x + c.width));
  const maxY = Math.max(...children.map((c) => c.y + c.height));

  return {
    x: minX - pad.left,
    y: minY - pad.top,
    width: maxX - minX + pad.left + pad.right,
    height: maxY - minY + pad.top + pad.bottom,
  };
}

export { NODE_WIDTH, BASE_NODE_HEIGHT, DEFAULT_GROUP_PADDING };
