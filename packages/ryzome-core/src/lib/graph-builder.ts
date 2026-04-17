import {
	computeCanvasLayout,
	type LayoutInput,
	type LayoutRect,
} from "@ryzome-ai/canvas-layout-ts";
import { ObjectId } from "bson";
import type { PatchOperation } from "./client/index.js";
import {
	computeLegacyLayoutRects,
	estimateNodeHeight,
	NODE_WIDTH,
} from "./layout.js";

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

export interface CanvasPatchOperations {
	operations: PatchOperation[];
}

type LayoutEngine = "elk" | "legacy";

function resolveLayoutEngine(): LayoutEngine {
	const raw = process.env.RYZOME_LAYOUT_ENGINE?.toLowerCase();
	if (raw === "legacy") return "legacy";
	return "elk";
}

async function computeRects(
	steps: StepInput[],
	groups: GroupInput[] | undefined,
	engine: LayoutEngine,
): Promise<{
	nodeRects: Map<string, LayoutRect>;
	groupRects: Map<string, LayoutRect>;
}> {
	if (engine === "legacy") {
		return computeLegacyLayoutRects(steps, groups);
	}

	const layoutInput: LayoutInput = {
		nodes: steps.map((s) => ({
			id: s.id,
			width: NODE_WIDTH,
			height: estimateNodeHeight(s.description),
			group: s.group,
			dependsOn: s.dependsOn,
		})),
		groups: groups?.map((g) => ({ id: g.id, title: g.title })),
	};

	const result = await computeCanvasLayout(layoutInput);

	return {
		nodeRects: new Map(Object.entries(result.nodes)),
		groupRects: new Map(Object.entries(result.groups)),
	};
}

export async function buildCanvasGraph(
	steps: StepInput[],
	canvasId: string,
	groups?: GroupInput[],
): Promise<CanvasPatchOperations> {
	void canvasId;

	const engine = resolveLayoutEngine();
	const { nodeRects, groupRects } = await computeRects(steps, groups, engine);

	const nodeIdMap = new Map<string, string>();
	for (const step of steps) {
		nodeIdMap.set(step.id, new ObjectId().toString());
	}

	const nodeOperations: PatchOperation[] = steps.map((step) => {
		const id = nodeIdMap.get(step.id);
		const rect = nodeRects.get(step.id);

		if (!id || !rect) {
			throw new Error(`Missing layout for step ${step.id}`);
		}

		return {
			_type: "createNode" as const,
			id,
			height: rect.height,
			width: rect.width,
			x: rect.x,
			y: rect.y,
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
		const rect = groupRects.get(group.id);
		if (!rect) continue;

		const groupNodeId = new ObjectId().toString();

		groupOperations.push({
			_type: "createNode" as const,
			id: groupNodeId,
			x: rect.x,
			y: rect.y,
			width: rect.width,
			height: rect.height,
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
