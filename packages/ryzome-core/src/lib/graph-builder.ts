import {
	computeLayout,
	computeGroupBounds,
	estimateNodeHeight,
	NODE_WIDTH,
} from "./layout.js";
import type { PatchOperation } from "./client/index.js";
import { ObjectId } from "bson";

export interface StepInput {
	id: string;
	title: string;
	description: string;
	dependsOn?: string[];
	color?: string;
	group?: string;
}

export interface GroupInput {
	id: string;
	title?: string;
	color?: string;
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
	groups?: GroupInput[],
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

	const colorOperations: PatchOperation[] = steps
		.filter((s) => s.color)
		.map((s) => {
			const id = nodeIdMap.get(s.id);
			if (!id) throw new Error(`Missing node ID for step ${s.id}`);
			return { _type: "setNodeColor" as const, id, color: s.color };
		});

	const groupOperations: PatchOperation[] = [];
	const groupColorOperations: PatchOperation[] = [];

	for (const group of groups ?? []) {
		const memberSteps = steps.filter((s) => s.group === group.id);
		if (memberSteps.length === 0) continue;

		const children = memberSteps.map((s) => {
			const pos = positions.get(s.id);
			if (!pos) throw new Error(`Missing position for step ${s.id}`);
			const height = estimateNodeHeight(s.description);
			return { x: pos.x, y: pos.y, width: NODE_WIDTH, height };
		});

		const bounds = computeGroupBounds(children);
		if (!bounds) continue;

		const groupNodeId = new ObjectId().toString();

		groupOperations.push({
			_type: "createNode" as const,
			id: groupNodeId,
			x: bounds.x,
			y: bounds.y,
			width: bounds.width,
			height: bounds.height,
			data: {
				_type: "Group" as const,
				_content: { title: group.title ?? null },
			},
		});

		if (group.color) {
			groupColorOperations.push({
				_type: "setNodeColor" as const,
				id: groupNodeId,
				color: group.color,
			});
		}
	}

	return {
		operations: [
			...groupOperations,
			...nodeOperations,
			...edgeOperations,
			...colorOperations,
			...groupColorOperations,
		],
	};
}
