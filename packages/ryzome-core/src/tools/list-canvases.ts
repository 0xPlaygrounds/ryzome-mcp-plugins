import { z } from "zod";
import { buildCanvasAppUrl } from "../lib/app-url.js";
import {
	RyzomeApiError,
	RyzomeClient,
	type RyzomeClientConfig,
} from "../lib/ryzome-client.js";

export const listCanvasesToolName = "list_ryzome_canvases";
export const listCanvasesToolDescription =
	"List all Ryzome canvases accessible to the current user. Returns canvas names, IDs, and descriptions.";

export const listCanvasesParamsSchema = z.object({
	pinned: z
		.boolean()
		.optional()
		.describe("Filter to only pinned canvases if true"),
});

export async function executeListCanvases(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
	const params = listCanvasesParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);

	try {
		const result = await client.listCanvases(
			params.pinned != null ? { pinned: params.pinned } : undefined,
		);

		const summaries = result.data.map((c) => ({
			id: c._id.$oid,
			name: c.name,
			description: c.description ?? null,
			pinned: c.pinned ?? false,
			isTemplate: c.isTemplate,
			updatedAt: c.updatedAt,
			url: buildCanvasAppUrl(clientConfig.appUrl, c._id.$oid),
		}));

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{ count: summaries.length, canvases: summaries },
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
