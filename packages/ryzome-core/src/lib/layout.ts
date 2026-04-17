import type { LayoutRect } from "@ryzome-ai/canvas-layout-ts";

const NODE_WIDTH = 320;
const NODE_GAP_X = 80;
const NODE_GAP_Y = 60;
const BASE_NODE_HEIGHT = 180;
const CHAR_HEIGHT_FACTOR = 0.3;
const GROUP_PADDING_TOP = 60;
const GROUP_PADDING_SIDE = 40;

export function estimateNodeHeight(description: string): number {
	const lineCount = Math.ceil(description.length / 40);
	return Math.max(
		BASE_NODE_HEIGHT,
		BASE_NODE_HEIGHT + lineCount * CHAR_HEIGHT_FACTOR * 10,
	);
}

interface LegacyStep {
	id: string;
	description: string;
	dependsOn?: string[];
	group?: string;
}

interface LegacyGroup {
	id: string;
}

/**
 * Legacy depth-grid layout, retained for rollback via RYZOME_LAYOUT_ENGINE=legacy.
 * Assigns each node a depth via BFS over dependsOn, spreads depths horizontally
 * in fixed-width rows, then wraps group bounding boxes around post-hoc members.
 */
export function computeLegacyLayoutRects(
	steps: LegacyStep[],
	groups: LegacyGroup[] | undefined,
): {
	nodeRects: Map<string, LayoutRect>;
	groupRects: Map<string, LayoutRect>;
} {
	const depths = computeDepths(steps);

	const byDepth = new Map<number, LegacyStep[]>();
	for (const step of steps) {
		const depth = depths.get(step.id) ?? 0;
		const list = byDepth.get(depth) ?? [];
		list.push(step);
		byDepth.set(depth, list);
	}

	const nodeRects = new Map<string, LayoutRect>();
	const maxDepth = Math.max(...Array.from(byDepth.keys()), 0);

	let cumulativeY = 0;
	for (let depth = 0; depth <= maxDepth; depth++) {
		const group = byDepth.get(depth) ?? [];
		const totalWidth =
			group.length * NODE_WIDTH + Math.max(group.length - 1, 0) * NODE_GAP_X;
		const startX = -totalWidth / 2;

		for (let i = 0; i < group.length; i++) {
			const step = group[i];
			nodeRects.set(step.id, {
				x: startX + i * (NODE_WIDTH + NODE_GAP_X),
				y: cumulativeY,
				width: NODE_WIDTH,
				height: estimateNodeHeight(step.description),
			});
		}

		cumulativeY += BASE_NODE_HEIGHT + NODE_GAP_Y;
	}

	const groupRects = new Map<string, LayoutRect>();
	for (const group of groups ?? []) {
		const members = steps.filter((s) => s.group === group.id);
		if (members.length === 0) continue;

		const memberRects = members
			.map((s) => nodeRects.get(s.id))
			.filter((r): r is LayoutRect => r !== undefined);
		if (memberRects.length === 0) continue;

		const minX = Math.min(...memberRects.map((r) => r.x));
		const minY = Math.min(...memberRects.map((r) => r.y));
		const maxX = Math.max(...memberRects.map((r) => r.x + r.width));
		const maxY = Math.max(...memberRects.map((r) => r.y + r.height));

		groupRects.set(group.id, {
			x: minX - GROUP_PADDING_SIDE,
			y: minY - GROUP_PADDING_TOP,
			width: maxX - minX + GROUP_PADDING_SIDE * 2,
			height: maxY - minY + GROUP_PADDING_TOP + GROUP_PADDING_SIDE,
		});
	}

	return { nodeRects, groupRects };
}

function computeDepths(steps: LegacyStep[]): Map<string, number> {
	const depths = new Map<string, number>();
	const dependents = new Map<string, string[]>();

	for (const step of steps) {
		dependents.set(step.id, []);
	}

	for (const step of steps) {
		for (const dep of step.dependsOn ?? []) {
			const list = dependents.get(dep);
			if (list) list.push(step.id);
		}
	}

	const roots = steps.filter((s) => !s.dependsOn?.length);
	const queue: Array<{ id: string; depth: number }> = roots.map((r) => ({
		id: r.id,
		depth: 0,
	}));

	while (queue.length > 0) {
		const next = queue.shift();
		if (!next) break;

		const { id, depth } = next;
		const current = depths.get(id);
		if (current !== undefined && current >= depth) continue;
		depths.set(id, depth);
		for (const child of dependents.get(id) ?? []) {
			queue.push({ id: child, depth: depth + 1 });
		}
	}

	for (const step of steps) {
		if (!depths.has(step.id)) depths.set(step.id, 0);
	}

	return depths;
}

export { NODE_WIDTH, BASE_NODE_HEIGHT };
