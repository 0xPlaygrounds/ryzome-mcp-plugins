import { z } from "zod";
import { buildDocumentViewAppUrl } from "../lib/app-url.js";
import {
	RyzomeClient,
	type RyzomeClientConfig,
} from "../lib/ryzome-client.js";

export const getDocumentToolName = "get_ryzome_document";
export const getDocumentToolDescription =
	"Retrieve a standalone Ryzome document by its ID.";

export const getDocumentParamsSchema = z.object({
	document_id: z.string().describe("The ID of the document to retrieve"),
});

export async function executeGetDocument(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
	const params = getDocumentParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);

	const document = await client.getDocument(params.document_id);
	const url = buildDocumentViewAppUrl(clientConfig.appUrl, document);

	return {
		content: [
			{
				type: "text",
				text: JSON.stringify(
					{
						id: document._id.$oid,
						title: document.title ?? "Untitled",
						description: document.description,
						contentType: document.content._type,
						inLibrary: document.inLibrary ?? false,
						isFavorite: document.isFavorite ?? false,
						tags: document.tags ?? [],
						url,
						content: document.content,
					},
					null,
					2,
				),
			},
		],
	};
}
