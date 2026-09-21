import { z } from "zod";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";
import { formatConversationAsMarkdown } from "../lib/format-conversation-markdown.js";
import { toStructuredConversation } from "../lib/structured.js";

export const getConversationToolName = "get_ryzome_conversation";
export const getConversationToolDescription =
	"Read a Ryzome conversation with its attached context and full message history.";
export const getConversationParamsSchema = z.object({
	conversation_id: z.string().regex(/^[a-fA-F0-9]{24}$/),
});
export async function executeGetConversation(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = getConversationParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);
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
		structuredContent: toStructuredConversation(
			conversation,
			clientConfig.appUrl,
		),
	};
}
