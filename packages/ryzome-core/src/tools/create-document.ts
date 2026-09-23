import { z } from "zod";
import { buildDocumentViewAppUrl } from "../lib/app-url.js";
import {
	type DocumentContentInput,
	documentContentInputSchema,
	toDocumentContentView,
} from "../lib/document-content.js";
import { objectIdStringSchema } from "../lib/ids.js";
import { applyHeader, mergeTags, provenanceSchema } from "../lib/provenance.js";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";

export const createDocumentToolName = "create_ryzome_document";
export const createDocumentToolDescription =
	"Create a standalone Ryzome document that appears in the library. " +
	"The result starts with a 'View: <url>' line — include that URL verbatim in your reply so the user can open the document.";

export const createDocumentParamsSchema = z.object({
	id: objectIdStringSchema
		.optional()
		.describe("Optional caller-supplied 24-hex id for the document"),
	title: z.string().optional().describe("Document title"),
	description: z.string().optional().describe("Document description"),
	tags: z.array(z.string()).optional().describe("Document tags"),
	provenance: provenanceSchema.optional(),
	content: documentContentInputSchema
		.optional()
		.describe("Initial document content"),
});

function withHeader(
	content: DocumentContentInput,
	header: string | undefined,
): DocumentContentInput {
	if (content._type !== "Text" || !header) return content;
	return {
		...content,
		_content: {
			...content._content,
			text: applyHeader(content._content.text, header),
		},
	};
}

export async function executeCreateDocument(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = createDocumentParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);

	const header = params.provenance?.header;
	const content = params.content
		? withHeader(params.content, header)
		: header
			? ({
					_type: "Text",
					_content: { text: applyHeader("", header) },
				} satisfies DocumentContentInput)
			: undefined;

	const document = await client.createDocument({
		...(params.id ? { _id: params.id } : {}),
		title: params.title,
		description: params.description,
		tags: mergeTags(params.tags, params.provenance?.tags),
		content: content ? toDocumentContentView(content) : undefined,
	});

	const documentUrl = buildDocumentViewAppUrl(clientConfig.appUrl, document);

	return {
		content: [
			{
				type: "text" as const,
				text: [
					`View: ${documentUrl}`,
					`Document created: **${document.title ?? "Untitled"}**`,
					`Type: ${document.content._type}`,
					`ID: ${document._id.$oid}`,
				].join("\n"),
			},
		],
		structuredContent: {
			id: document._id.$oid,
			title: document.title ?? "Untitled",
			kind: document.content._type,
			viewUrl: documentUrl,
		},
	};
}
