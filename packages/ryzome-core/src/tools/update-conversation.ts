import { z } from "zod";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";
import { formatConversationAsMarkdown } from "../lib/format-conversation-markdown.js";

export const updateConversationToolName = "update_ryzome_conversation";
export const updateConversationToolDescription =
	"Update a Ryzome conversation's title, pinned state, or context. Setting context replaces the attached documents; removed_context marks documents as removed without deleting them.";
export const updateConversationParamsSchema = z.object({
	conversation_id: z.string().regex(/^[a-fA-F0-9]{24}$/),
	title: z.string().optional(),
	pinned: z.boolean().optional(),
	context: z
		.array(z.string().regex(/^[a-fA-F0-9]{24}$/))
		.optional()
		.describe("Replace the attached context documents with these IDs"),
	removed_context: z
		.array(z.string().regex(/^[a-fA-F0-9]{24}$/))
		.optional()
		.describe("Mark these document IDs as removed from context"),
});
export async function executeUpdateConversation(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = updateConversationParamsSchema.parse(rawParams);
	if (
		params.title === undefined &&
		params.pinned === undefined &&
		params.context === undefined &&
		params.removed_context === undefined
	) {
		throw new Error("No conversation updates provided.");
	}
	const client = new RyzomeClient(clientConfig);
	await client.patchConversation(params.conversation_id, {
		title: params.title,
		pinned: params.pinned,
		context: params.context,
		removed_context: params.removed_context,
	});
	const conversation = await client.getConversation(params.conversation_id);
	return {
		content: [
			{
				type: "text" as const,
				text: formatConversationAsMarkdown(conversation, {
					appUrl: clientConfig.appUrl,
				}),
			},
		],
	};
}
