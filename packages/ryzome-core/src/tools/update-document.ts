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

export const updateDocumentToolName = "update_ryzome_document";
export const updateDocumentToolDescription =
	"Update a standalone Ryzome document using document operations and metadata changes.";

export const updateDocumentParamsSchema = z.object({
	document_id: z.string().describe("The ID of the document to update"),
	title: z.string().optional().describe("Replace the document title"),
	favorite: z
		.boolean()
		.optional()
		.describe("Set the document favorite state"),
	content: documentContentInputSchema
		.optional()
		.describe("Replace the full document content"),
	append_text: z
		.string()
		.optional()
		.describe("Append text to a Text document"),
	description: z.string().optional().describe("Update the document description"),
	tags: z.array(z.string()).optional().describe("Replace the document tags"),
	in_library: z
		.boolean()
		.optional()
		.describe("Control whether the document appears in the library"),
	archived: z.boolean().optional().describe("Archive or unarchive the document"),
	thumbnail_s3_key: z
		.string()
		.optional()
		.describe("Set the thumbnail S3 key for the document"),
});

export async function executeUpdateDocument(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
	const params = updateDocumentParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);

	const operations = [
		...(params.title
			? [
					{
						_type: "setTitle" as const,
						title: params.title,
					},
				]
			: []),
		...(params.favorite != null
			? [
					{
						_type: "setFavoriteState" as const,
						isFavorite: params.favorite,
					},
				]
			: []),
		...(params.content
			? [
					{
						_type: "setContent" as const,
						content: toDocumentContentView(params.content),
					},
				]
			: []),
		...(params.append_text
			? [
					{
						_type: "appendDocumentContent" as const,
						content: params.append_text,
					},
				]
			: []),
	];

	const metadata = Object.fromEntries(
		Object.entries({
			description: params.description,
			tags: params.tags,
			inLibrary: params.in_library,
			archived: params.archived,
			thumbnailS3Key: params.thumbnail_s3_key,
		}).filter(([, value]) => value !== undefined),
	);

	if (operations.length === 0 && Object.keys(metadata).length === 0) {
		throw new Error("No document updates provided.");
	}

	try {
		if (operations.length > 0) {
			await client.patchDocument(params.document_id, { operations });
		}

		if (Object.keys(metadata).length > 0) {
			await client.updateDocumentMetadata(params.document_id, metadata);
		}

		const document = await client.getDocument(params.document_id);
		const url = buildDocumentViewAppUrl(clientConfig.appUrl, document);

		return {
			content: [
				{
					type: "text",
					text: [
						`Document updated: **${document.title ?? "Untitled"}**`,
						`Type: ${document.content._type}`,
						`ID: ${document._id.$oid}`,
						`View: ${url}`,
					].join("\n"),
				},
			],
		};
	} catch (error) {
		if (error instanceof RyzomeApiError) throw error;
		throw error;
	}
}
