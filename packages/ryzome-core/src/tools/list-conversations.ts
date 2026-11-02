import { z } from "zod";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";
import { buildConversationAppUrl } from "../lib/format-conversation-markdown.js";

export const listConversationsToolName = "list_ryzome_conversations";
export const listConversationsToolDescription =
	"List Ryzome conversations, optionally filtered to pinned ones.";
export const listConversationsParamsSchema = z.object({
	pinned: z
		.boolean()
		.optional()
		.describe("Only return pinned conversations if true"),
});
export async function executeListConversations(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = listConversationsParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);
	const conversations = await client.listConversations({
		pinned: params.pinned,
	});
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
