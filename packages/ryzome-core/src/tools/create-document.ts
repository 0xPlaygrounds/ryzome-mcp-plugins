import { z } from "zod";
import { buildDocumentViewAppUrl } from "../lib/app-url.js";
import {
	documentContentInputSchema,
	toDocumentContentView,
} from "../lib/document-content.js";
import {
	RyzomeApiError,
	RyzomeClient,
	type RyzomeClientConfig,
} from "../lib/ryzome-client.js";

export const createDocumentToolName = "create_ryzome_document";
export const createDocumentToolDescription =
	"Create a standalone Ryzome document that appears in the library.";

export const createDocumentParamsSchema = z.object({
	title: z.string().optional().describe("Document title"),
	description: z.string().optional().describe("Document description"),
	tags: z.array(z.string()).optional().describe("Document tags"),
	content: documentContentInputSchema
		.optional()
		.describe("Initial document content"),
});

export async function executeCreateDocument(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
	const params = createDocumentParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);

	try {
		const document = await client.createDocument({
			title: params.title,
			description: params.description,
			tags: params.tags,
			content: params.content
				? toDocumentContentView(params.content)
				: undefined,
		});

		const documentUrl = buildDocumentViewAppUrl(clientConfig.appUrl, document);

		return {
			content: [
				{
					type: "text",
					text: [
						`Document created: **${document.title ?? "Untitled"}**`,
						`Type: ${document.content._type}`,
						`ID: ${document._id.$oid}`,
						`View: ${documentUrl}`,
					].join("\n"),
				},
			],
		};
	} catch (error) {
		if (error instanceof RyzomeApiError) throw error;
		throw error;
	}
}
