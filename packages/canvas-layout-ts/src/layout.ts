import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode, ElkExtendedEdge, LayoutOptions as ElkLayoutOptions } from "elkjs/lib/elk-api";
import type {
	LayoutInput,
	LayoutNodeInput,
	LayoutOptions,
	LayoutRect,
	LayoutResult,
} from "./types.js";

const DEFAULT_NODE_WIDTH = 320;
const DEFAULT_NODE_HEIGHT = 180;

const DEFAULT_SPACING = {
	nodeNode: 80,
	nodeNodeBetweenLayers: 60,
	edgeNode: 40,
} as const;

const DEFAULT_GROUP_PADDING = 40;
const GROUP_HEADER_PADDING = 60;

/**
 * Lay out a Ryzome canvas with elkjs. Groups become compound (parent) nodes so
 * members stay spatially clustered; the result includes both individual node
 * rects and group bounding boxes in canvas-absolute coordinates.
 */
export async function computeCanvasLayout(
	input: LayoutInput,
	options: LayoutOptions = {},
): Promise<LayoutResult> {
	const nodes = input.nodes ?? [];
	if (nodes.length === 0) {
		return { nodes: {}, groups: {} };
	}

	const spacing = { ...DEFAULT_SPACING, ...options.spacing };
	const direction = options.direction ?? "DOWN";
	const groupPadding = options.groupPadding ?? DEFAULT_GROUP_PADDING;

	const measureNode =
		options.measureNode ??
		((node: LayoutNodeInput) => ({
			width: node.width ?? DEFAULT_NODE_WIDTH,
			height: node.height ?? DEFAULT_NODE_HEIGHT,
		}));

	const nodeIds = new Set(nodes.map((n) => n.id));
	const declaredGroupIds = new Set((input.groups ?? []).map((g) => g.id));

	const membersByGroup = new Map<string, LayoutNodeInput[]>();
	const rootMembers: LayoutNodeInput[] = [];

	for (const node of nodes) {
		if (node.group && declaredGroupIds.has(node.group)) {
			const list = membersByGroup.get(node.group) ?? [];
			list.push(node);
			membersByGroup.set(node.group, list);
		} else {
			rootMembers.push(node);
		}
	}

	// Edges: union of input.edges and per-node dependsOn. Drop references to
	// unknown nodes to match the existing buildCanvasGraph "orphan edges are
	// silently dropped" behavior.
	const edgeKeys = new Set<string>();
	const elkEdges: ElkExtendedEdge[] = [];

	const addEdge = (from: string, to: string) => {
		if (!nodeIds.has(from) || !nodeIds.has(to)) return;
		const key = `${from}->${to}`;
		if (edgeKeys.has(key)) return;
		edgeKeys.add(key);
		elkEdges.push({
			id: `e${elkEdges.length}`,
			sources: [from],
			targets: [to],
		});
	};

	for (const edge of input.edges ?? []) {
		addEdge(edge.from, edge.to);
	}
	for (const node of nodes) {
		for (const dep of node.dependsOn ?? []) {
			addEdge(dep, node.id);
		}
	}

	const makeLeafNode = (node: LayoutNodeInput): ElkNode => {
		const { width, height } = measureNode(node);
		return { id: node.id, width, height };
	};

	const rootChildren: ElkNode[] = rootMembers.map(makeLeafNode);

	for (const group of input.groups ?? []) {
		const members = membersByGroup.get(group.id) ?? [];
		if (members.length === 0) continue;

		const pad = group.padding ?? groupPadding;
		const groupNode: ElkNode = {
			id: group.id,
			children: members.map(makeLeafNode),
			layoutOptions: {
				"elk.padding": `[top=${GROUP_HEADER_PADDING},left=${pad},bottom=${pad},right=${pad}]`,
				// Still layer members inside the group.
				"elk.algorithm": "layered",
				"elk.direction": direction,
				"elk.layered.spacing.nodeNodeBetweenLayers": String(
					spacing.nodeNodeBetweenLayers,
				),
				"elk.spacing.nodeNode": String(spacing.nodeNode),
			},
		};
		rootChildren.push(groupNode);
	}

	const rootLayoutOptions: ElkLayoutOptions = {
		"elk.algorithm": "layered",
		"elk.direction": direction,
		"elk.layered.spacing.nodeNodeBetweenLayers": String(
			spacing.nodeNodeBetweenLayers,
		),
		"elk.spacing.nodeNode": String(spacing.nodeNode),
		"elk.spacing.edgeNode": String(spacing.edgeNode),
		// Place disconnected components side-by-side instead of overlapping them at the origin.
		"elk.separateConnectedComponents": "true",
		// Consider node size when routing; hierarchical edges cross group boundaries.
		"elk.hierarchyHandling": "INCLUDE_CHILDREN",
	};

	const root: ElkNode = {
		id: "__root__",
		layoutOptions: rootLayoutOptions,
		children: rootChildren,
		edges: elkEdges,
	};

	const elk = new ELK();
	const laidOut = await elk.layout(root);

	const nodeRects: Record<string, LayoutRect> = {};
	const groupRects: Record<string, LayoutRect> = {};

	const walk = (
		node: ElkNode,
		parentX: number,
		parentY: number,
		isGroup: boolean,
	): void => {
		const x = parentX + (node.x ?? 0);
		const y = parentY + (node.y ?? 0);
		const width = node.width ?? 0;
		const height = node.height ?? 0;

		if (isGroup) {
			groupRects[node.id] = { x, y, width, height };
		} else if (node.id !== "__root__") {
			nodeRects[node.id] = { x, y, width, height };
		}

		for (const child of node.children ?? []) {
			walk(child, x, y, declaredGroupIds.has(child.id));
		}
	};

	walk(laidOut as ElkNode, 0, 0, false);

	return { nodes: nodeRects, groups: groupRects };
}
