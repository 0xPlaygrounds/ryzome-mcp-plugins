import { z } from "zod";
import { buildCanvasAppUrl } from "../lib/app-url.js";
import {
	canvasOperationSchema,
	toPatchOperation,
} from "../lib/canvas-operations.js";
import { objectIdStringSchema } from "../lib/ids.js";
import { retryStage } from "../lib/retry.js";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";

export const updateCanvasToolName = "update_ryzome_canvas";
export const updateCanvasToolDescription =
	"Apply canvas operations to an existing Ryzome canvas: setName, createNode (Group | ExistingDocument | NewDocument), " +
	"setNodePosition, setNodeSize, setNodeTitle, setNodeColor, setNodeContent, appendNodeContent, setNodeFavoriteState, deleteNode, " +
	"createEdge, setEdgeLabel, setEdgePosition, deleteEdge. Operations are applied in order in a single request.";

export const updateCanvasParamsSchema = z.object({
	canvasId: objectIdStringSchema.describe("ID of the canvas to update"),
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
	const operations = params.operations.map(toPatchOperation);

	await retryStage(() => client.patchCanvas(params.canvasId, { operations }));

	const url = buildCanvasAppUrl(clientConfig.appUrl, params.canvasId);
	const result = { canvasId: params.canvasId, applied: operations.length, url };

	return {
		content: [
			{
				type: "text" as const,
				text: [
					`View: ${url}`,
					`Canvas updated: ${params.canvasId}`,
					`Applied: ${operations.length} operation${operations.length === 1 ? "" : "s"}`,
				].join("\n"),
			},
		],
		structuredContent: result,
	};
}
