import {
	buildCanvasGraph,
	type StepInput,
	type GroupInput,
	type EdgeInput,
} from "./graph-builder.js";
import { buildCanvasAppUrl } from "./app-url.js";
import { mergeTags, type ProvenanceInput } from "./provenance.js";
import { RyzomeClient, type RyzomeClientConfig } from "./ryzome-client.js";
import type { CanvasCreationResult } from "./structured.js";

export interface CanvasWithStepsParams {
	title: string;
	description?: string;
	/** Caller-supplied 24-hex id for the canvas document. */
	id?: string;
	tags?: string[];
	provenance?: ProvenanceInput;
	steps: StepInput[];
	groups?: GroupInput[];
	edges?: EdgeInput[];
}

export async function executeCanvasWithSteps(
	params: CanvasWithStepsParams,
	clientConfig: RyzomeClientConfig,
): Promise<{
	content: Array<{ type: "text"; text: string }>;
	structuredContent: CanvasCreationResult;
}> {
	// Validate and lay out the graph before creating any remote document.
	const graph = await buildCanvasGraph(
		params.steps,
		params.id ?? "",
		params.groups,
		{
			header: params.provenance?.header,
			edges: params.edges,
		},
	);
	const client = new RyzomeClient(clientConfig);

	const { canvas_id } = await client.createCanvas({
		name: params.title,
		description: params.description,
		id: params.id,
		tags: mergeTags(params.tags, params.provenance?.tags),
	});

	const canvasId = canvas_id.$oid;
	await client.patchCanvas(canvasId, { operations: graph.operations });

	const canvasUrl = buildCanvasAppUrl(clientConfig.appUrl, canvasId);

	const nodeCount = graph.operations.filter(
		(o) => o._type === "createNode",
	).length;
	const edgeCount = graph.operations.filter(
		(o) => o._type === "createEdge",
	).length;

	return {
		content: [
			{
				type: "text",
				text: [
					`View: ${canvasUrl}`,
					`Canvas created: **${params.title}**`,
					`Nodes: ${nodeCount} | Edges: ${edgeCount}`,
				].join("\n"),
			},
		],
		structuredContent: {
			id: canvasId,
			viewUrl: canvasUrl,
			nodeCount,
			edgeCount,
		},
	};
}
