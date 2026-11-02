import { z } from "zod";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";
import { buildConversationAppUrl } from "../lib/format-conversation-markdown.js";

export const searchConversationsToolName = "search_ryzome_conversations";
export const searchConversationsToolDescription =
	"Search Ryzome conversations by title or message content.";
export const searchConversationsParamsSchema = z.object({
	query: z.string().min(1).describe("Search query"),
});
export async function executeSearchConversations(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = searchConversationsParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);
	const conversations = await client.searchConversations(params.query);
	const summaries = conversations.map((conversation) => ({
		id: conversation._id.$oid,
		title: conversation.title,
		pinned: conversation.pinned ?? false,
		updatedAt: conversation.updatedAt,
		url: buildConversationAppUrl(clientConfig.appUrl, conversation._id.$oid),
	}));
	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify(
					{ count: summaries.length, conversations: summaries },
					null,
					2,
				),
			},
		],
	};
}
