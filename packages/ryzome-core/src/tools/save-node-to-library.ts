import { z } from "zod";
import { buildDocumentViewAppUrl } from "../lib/app-url.js";
import {
	RyzomeApiError,
	RyzomeClient,
	type RyzomeClientConfig,
} from "../lib/ryzome-client.js";

export const saveNodeToLibraryToolName = "save_ryzome_node_to_library";
export const saveNodeToLibraryToolDescription =
	"Promote an existing canvas node's backing document into the library.";

export const saveNodeToLibraryParamsSchema = z.object({
	canvas_id: z.string().describe("The ID of the canvas containing the node"),
	node_id: z.string().describe("The ID of the node to save to the library"),
});

export async function executeSaveNodeToLibrary(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
	const params = saveNodeToLibraryParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);

	try {
		const canvas = await client.getCanvas(params.canvas_id);
		const node = canvas.nodes.find((candidate) => candidate._id.$oid === params.node_id);

		if (!node) {
			throw new Error(
				`Node ${params.node_id} was not found on canvas ${params.canvas_id}.`,
			);
		}

		if (node.data._type !== "Document") {
			throw new Error("Only document-backed nodes can be saved to the library.");
		}

		const document = node.data;
		if (document.inLibrary) {
			return {
				content: [
					{
						type: "text",
						text: [
							`Document already in library: **${document.title ?? "Untitled"}**`,
							`ID: ${document._id.$oid}`,
							`View: ${buildDocumentViewAppUrl(clientConfig.appUrl, document)}`,
						].join("\n"),
					},
				],
			};
		}

		await client.updateDocumentMetadata(document._id.$oid, {
			inLibrary: true,
		});

		return {
			content: [
				{
					type: "text",
					text: [
						`Saved node document to library: **${document.title ?? "Untitled"}**`,
						`Document ID: ${document._id.$oid}`,
						`View: ${buildDocumentViewAppUrl(clientConfig.appUrl, document)}`,
					].join("\n"),
				},
			],
		};
	} catch (error) {
		if (error instanceof RyzomeApiError) throw error;
		throw error;
	}
}
