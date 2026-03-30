import { computeLayout, estimateNodeHeight, NODE_WIDTH } from "./layout.js";
import type { PatchOperation } from "./client/index.js";
import { ObjectId } from "bson";

export interface StepInput {
	id: string;
	title: string;
	description: string;
	dependsOn?: string[];
}

/**
 * Computes the depth of each step in the DAG via BFS from root nodes.
 */
function computeDepths(steps: StepInput[]): Map<string, number> {
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

export interface CanvasPatchOperations {
	operations: PatchOperation[];
}

export function buildCanvasGraph(
	steps: StepInput[],
	canvasId: string,
): CanvasPatchOperations {
	void canvasId;
	const depths = computeDepths(steps);

	const layoutNodes = steps.map((s) => ({
		id: s.id,
		depth: depths.get(s.id) ?? 0,
	}));

	const positions = computeLayout(layoutNodes);

	const nodeIdMap = new Map<string, string>();
	for (const step of steps) {
		nodeIdMap.set(step.id, new ObjectId().toString());
	}

	const nodeOperations: PatchOperation[] = steps.map((step) => {
		const id = nodeIdMap.get(step.id);
		const pos = positions.get(step.id);
		const height = estimateNodeHeight(step.description);

		if (!id || !pos) {
			throw new Error(`Missing graph metadata for step ${step.id}`);
		}

		return {
			_type: "createNode" as const,
			id,
			height,
			width: NODE_WIDTH,
			x: pos.x,
			y: pos.y,
			data: {
				_type: "NewDocument" as const,
				_content: {
					id,
					title: step.title,
					content: {
						_type: "Text" as const,
						_content: { text: step.description },
					},
					generated: true,
				},
			},
		};
	});

	const edgeOperations: PatchOperation[] = [];

	for (const step of steps) {
		for (const dep of step.dependsOn ?? []) {
			const fromId = nodeIdMap.get(dep);
			const toId = nodeIdMap.get(step.id);
			if (!fromId || !toId) continue;

			edgeOperations.push({
				_type: "createEdge" as const,
				id: new ObjectId().toString(),
				fromNodeId: fromId,
				fromSide: "bottom" as const,
				toNodeId: toId,
				toSide: "top" as const,
				label: "",
			});
		}
	}

	return {
		operations: [...nodeOperations, ...edgeOperations],
	};
}
