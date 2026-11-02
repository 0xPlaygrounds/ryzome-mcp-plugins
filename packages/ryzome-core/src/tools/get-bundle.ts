import { z } from "zod";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";
import { formatBundleAsMarkdown } from "../lib/format-bundle-markdown.js";
import { toStructuredBundle } from "../lib/structured.js";
export const getBundleToolName = "get_ryzome_bundle";
export const getBundleToolDescription =
	"Read a Ryzome bundle and its ordered document metadata, including unavailable members.";
export const getBundleParamsSchema = z.object({
	bundle_id: z.string().regex(/^[a-fA-F0-9]{24}$/),
});
export async function executeGetBundle(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = getBundleParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);
	const bundle = await client.getBundle(params.bundle_id);
	return {
		content: [
			{
				type: "text" as const,
				text: formatBundleAsMarkdown(bundle, { appUrl: clientConfig.appUrl }),
			},
		],
		structuredContent: toStructuredBundle(bundle),
	};
}
