import { z } from "zod";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";

export const deleteConversationToolName = "delete_ryzome_conversation";
export const deleteConversationToolDescription =
	"Delete Ryzome conversations by ID. The caller must own the conversations.";
export const deleteConversationParamsSchema = z.object({
	conversation_ids: z.array(z.string().regex(/^[a-fA-F0-9]{24}$/)).min(1),
});
export async function executeDeleteConversation(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = deleteConversationParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);
	const deleted = await client.deleteConversations(params.conversation_ids);
	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify({ deleted }, null, 2),
			},
		],
	};
}
