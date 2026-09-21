import { z } from "zod";
import { objectIdStringSchema } from "../lib/ids.js";
import { mergeTags, provenanceSchema } from "../lib/provenance.js";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";
import { formatBundleAsMarkdown } from "../lib/format-bundle-markdown.js";
export const createBundleToolName = "create_ryzome_bundle";
export const createBundleToolDescription =
	"Create an ordered Ryzome bundle containing existing documents. Include the returned View URL in your reply.";
export const createBundleParamsSchema = z.object({
	id: objectIdStringSchema
		.optional()
		.describe("Optional caller-supplied 24-hex id for the bundle document"),
	title: z.string().optional(),
	description: z.string().optional(),
	tags: z.array(z.string()).optional(),
	provenance: provenanceSchema
		.optional()
		.describe(
			"Provenance metadata; only `tags` applies to bundles (they have no text content)",
		),
	document_ids: z
		.array(objectIdStringSchema)
		.default([])
		.describe("Existing document IDs in initial order"),
});
export async function executeCreateBundle(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = createBundleParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);
	const bundle = await client.createBundle({
		id: params.id,
		title: params.title,
		description: params.description,
		tags: mergeTags(params.tags, params.provenance?.tags),
		documentIds: params.document_ids,
	});
	return {
		content: [
			{
				type: "text" as const,
				text: formatBundleAsMarkdown(bundle, { appUrl: clientConfig.appUrl }),
			},
		],
	};
}
