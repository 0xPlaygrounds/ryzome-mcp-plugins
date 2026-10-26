import { z } from "zod";
import { buildCanvasAppUrl } from "../lib/app-url.js";
import { canvasOperationSchema } from "../lib/canvas-operations.js";
import { objectIdStringSchema } from "../lib/ids.js";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";
import type { CanvasUpdateResult } from "../lib/structured.js";

export const updateCanvasToolName = "update_ryzome_canvas";
export const updateCanvasToolDescription =
	"Apply canvas operations to an existing Ryzome canvas: setName, createNode (Group | ExistingDocument | NewDocument), " +
	"setNodePosition, setNodeSize, setNodeTitle, setNodeColor, setNodeContent, appendNodeContent, setNodeFavoriteState, deleteNode, " +
	"createEdge, setEdgeLabel, setEdgePosition, deleteEdge. Operations are submitted in order in one request and are not automatically retried. Read back the canvas after an uncertain failure. Content supports Text, File, Youtube, Website, or an empty Canvas; use bundle tools for bundle content.";

export const updateCanvasParamsSchema = z.object({
	canvas_id: objectIdStringSchema.describe("ID of the canvas to update"),
	operations: z
		.array(canvasOperationSchema)
		.min(1)
		.describe("Ordered canvas operations to apply"),
});

export async function executeUpdateCanvas(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = updateCanvasParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);
	const operations = params.operations;

	await client.patchCanvas(params.canvas_id, { operations });

	const url = buildCanvasAppUrl(clientConfig.appUrl, params.canvas_id);
	const result: CanvasUpdateResult = {
		id: params.canvas_id,
		operationCount: operations.length,
		viewUrl: url,
	};

	return {
		content: [
			{
				type: "text" as const,
				text: [
					`View: ${url}`,
					`Canvas request accepted: ${params.canvas_id}`,
					`Submitted: ${operations.length} operation${operations.length === 1 ? "" : "s"}. Changes are not verified by the response.`,
				].join("\n"),
			},
		],
		structuredContent: result,
	};
}
