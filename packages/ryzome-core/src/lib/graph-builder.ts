import {
	computeCanvasLayout,
	type LayoutInput,
	type LayoutRect,
} from "@ryzome-ai/canvas-layout-ts";
import { ObjectId } from "bson";
import type { CreateNodeData, PatchOperation } from "./client/index.js";
import {
	computeGroupRectFromMembers,
	computeLegacyLayoutRects,
	estimateNodeHeight,
	NODE_WIDTH,
} from "./layout.js";
import { applyHeader } from "./provenance.js";

export interface StepInput {
	id: string;
	title: string;
	description: string;
	dependsOn?: string[];
	/** Optional edge labels keyed by the dependency (source) step id. */
	edgeLabels?: Record<string, string>;
	/** Optional caller-supplied 24-hex edge ids keyed by the dependency (source) step id. */
	edgeIds?: Record<string, string>;
	color?: string;
	group?: string;
	/**
	 * When set, the node references this existing document instead of creating
	 * a new one (`ExistingDocument`). `title`/`description` are then ignored.
	 */
	documentId?: string;
	/** Optional caller-supplied 24-hex id for the canvas node itself. */
	nodeId?: string;
	/** Explicit layout overrides; any field set here wins over the layout engine. */
	x?: number;
	y?: number;
	width?: number;
	height?: number;
}

export interface GroupInput {
	id: string;
	title?: string;
	color?: string;
}

export interface CanvasPatchOperations {
	operations: PatchOperation[];
}

export interface BuildCanvasGraphOptions {
	/** Prepended to every new node's Text content (see provenance). */
	header?: string;
}

type LayoutEngine = "elk" | "legacy";

function resolveLayoutEngine(): LayoutEngine {
	const raw = process.env.RYZOME_LAYOUT_ENGINE?.toLowerCase();
	if (raw === "legacy") return "legacy";
	return "elk";
}

function hasExplicitRect(step: StepInput): boolean {
	return (
		step.x !== undefined ||
		step.y !== undefined ||
		step.width !== undefined ||
		step.height !== undefined
	);
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
			width: s.width ?? NODE_WIDTH,
			height: s.height ?? estimateNodeHeight(s.description),
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

/**
 * Apply per-node explicit `x/y/width/height` on top of the engine layout, then
 * recompute the bounding box of any group whose members moved so the frame still
 * wraps its final member rects.
 */
function applyExplicitRects(
	steps: StepInput[],
	groups: GroupInput[] | undefined,
	nodeRects: Map<string, LayoutRect>,
	groupRects: Map<string, LayoutRect>,
): void {
	const touchedGroups = new Set<string>();

	for (const step of steps) {
		if (!hasExplicitRect(step)) continue;
		const rect = nodeRects.get(step.id);
		if (!rect) continue;
		nodeRects.set(step.id, {
			x: step.x ?? rect.x,
			y: step.y ?? rect.y,
			width: step.width ?? rect.width,
			height: step.height ?? rect.height,
		});
		if (step.group) touchedGroups.add(step.group);
	}

	for (const group of groups ?? []) {
		if (!touchedGroups.has(group.id)) continue;
		const memberRects = steps
			.filter((s) => s.group === group.id)
			.map((s) => nodeRects.get(s.id))
			.filter((r): r is LayoutRect => r !== undefined);
		const rect = computeGroupRectFromMembers(memberRects);
		if (rect) groupRects.set(group.id, rect);
	}
}

function buildNodeData(
	step: StepInput,
	id: string,
	header: string | undefined,
): CreateNodeData {
	if (step.documentId) {
		return {
			_type: "ExistingDocument",
			_content: { document_id: step.documentId },
		};
	}

	return {
		_type: "NewDocument",
		_content: {
			id,
			title: step.title,
			content: {
				_type: "Text",
				_content: { text: applyHeader(step.description, header) ?? "" },
			},
			generated: true,
		},
	};
}

export async function buildCanvasGraph(
	steps: StepInput[],
	canvasId: string,
	groups?: GroupInput[],
	options?: BuildCanvasGraphOptions,
): Promise<CanvasPatchOperations> {
	void canvasId;

	const engine = resolveLayoutEngine();
	const { nodeRects, groupRects } = await computeRects(steps, groups, engine);
	applyExplicitRects(steps, groups, nodeRects, groupRects);

	const nodeIdMap = new Map<string, string>();
	for (const step of steps) {
		nodeIdMap.set(step.id, step.nodeId ?? new ObjectId().toString());
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
			data: buildNodeData(step, id, options?.header),
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
				id: step.edgeIds?.[dep] ?? new ObjectId().toString(),
				fromNodeId: fromId,
				fromSide: "bottom" as const,
				toNodeId: toId,
				toSide: "top" as const,
				label: step.edgeLabels?.[dep] ?? "",
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
