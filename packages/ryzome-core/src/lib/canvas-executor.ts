import {
	buildCanvasGraph,
	type StepInput,
	type GroupInput,
} from "./graph-builder.js";
import { buildCanvasAppUrl } from "./app-url.js";
import { mergeTags, type ProvenanceInput } from "./provenance.js";
import { RyzomeClient, type RyzomeClientConfig } from "./ryzome-client.js";
import { retryStage } from "./retry.js";

export interface CanvasWithStepsParams {
	title: string;
	description?: string;
	/** Caller-supplied 24-hex id for the canvas document. */
	id?: string;
	tags?: string[];
	provenance?: ProvenanceInput;
	steps: StepInput[];
	groups?: GroupInput[];
}

export async function executeCanvasWithSteps(
	params: CanvasWithStepsParams,
	clientConfig: RyzomeClientConfig,
): Promise<{
	content: Array<{ type: "text"; text: string }>;
	structuredContent: {
		canvasId: string;
		url: string;
		nodeCount: number;
		edgeCount: number;
	};
}> {
	const client = new RyzomeClient(clientConfig);

	const { canvas_id } = await client.createCanvas({
		name: params.title,
		description: params.description,
		id: params.id,
		tags: mergeTags(params.tags, params.provenance?.tags),
	});

	const canvasId = canvas_id.$oid;
	const graph = await buildCanvasGraph(params.steps, canvasId, params.groups, {
		header: params.provenance?.header,
	});

	await retryStage(() =>
		client.patchCanvas(canvasId, { operations: graph.operations }),
	);

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
		structuredContent: { canvasId, url: canvasUrl, nodeCount, edgeCount },
	};
}
