import { z } from "zod";
import {
	RyzomeApiError,
	RyzomeClient,
	type RyzomeClientConfig,
} from "../lib/ryzome-client.js";

export const getCanvasToolName = "get_ryzome_canvas";
export const getCanvasToolDescription =
	"Retrieve a Ryzome canvas by its ID, including all nodes and edges.";

export const getCanvasParamsSchema = z.object({
	canvas_id: z.string().describe("The ID of the canvas to retrieve"),
});

export async function executeGetCanvas(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
	const params = getCanvasParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);

	try {
		const canvas = await client.getCanvas(params.canvas_id);

		const nodeCount = canvas.nodes.length;
		const edgeCount = canvas.edges.length;

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{
							id: canvas._id.$oid,
							name: canvas.name,
							description: canvas.description,
							nodeCount,
							edgeCount,
							nodes: canvas.nodes,
							edges: canvas.edges,
						},
						null,
						2,
					),
				},
			],
		};
	} catch (error) {
		if (error instanceof RyzomeApiError) throw error;
		throw error;
	}
}
