import { z } from "zod";
import { buildDocumentViewAppUrl } from "../lib/app-url.js";
import { documentContentTypeSchema } from "../lib/document-content.js";
import {
	RyzomeApiError,
	RyzomeClient,
	type RyzomeClientConfig,
} from "../lib/ryzome-client.js";

export const listDocumentsToolName = "list_ryzome_documents";
export const listDocumentsToolDescription =
	"List standalone Ryzome documents, optionally filtered by library visibility, favorites, tags, or content type.";

export const listDocumentsParamsSchema = z.object({
	tag: z.string().optional().describe("Filter to documents containing this tag"),
	favorite: z
		.boolean()
		.optional()
		.describe("Filter to favorite documents if true"),
	in_library_only: z
		.boolean()
		.optional()
		.describe("Only return documents visible in the library (defaults to true)"),
	content_types: z
		.array(documentContentTypeSchema)
		.optional()
		.describe("Filter to these document content types"),
});

export async function executeListDocuments(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
	const params = listDocumentsParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);

	try {
		const result = await client.listDocuments({
			tag: params.tag,
			favorite: params.favorite,
			inLibraryOnly: params.in_library_only ?? true,
			contentTypes: params.content_types,
		});

		const summaries = result.data.map((document) => ({
			id: document._id.$oid,
			title: document.title ?? "Untitled",
			description: document.description ?? null,
			contentType: document.content._type,
			inLibrary: document.inLibrary ?? false,
			isFavorite: document.isFavorite ?? false,
			tags: document.tags ?? [],
			updatedAt: document.updatedAt,
			url: buildDocumentViewAppUrl(clientConfig.appUrl, document),
		}));

		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{ count: summaries.length, documents: summaries },
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
