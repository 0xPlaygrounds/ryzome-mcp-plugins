import { z } from "zod";
import { RyzomeClient, type RyzomeClientConfig } from "../lib/ryzome-client.js";
import { formatConversationAsMarkdown } from "../lib/format-conversation-markdown.js";

export const addConversationMessageToolName = "add_ryzome_conversation_message";
export const addConversationMessageToolDescription =
	"Append a user message to a Ryzome conversation, optionally attaching documents as context. Returns the updated conversation.";
export const addConversationMessageParamsSchema = z.object({
	conversation_id: z.string().regex(/^[a-fA-F0-9]{24}$/),
	text: z.string().min(1).describe("Message text to append"),
	context: z
		.array(z.string().regex(/^[a-fA-F0-9]{24}$/))
		.optional()
		.describe("Existing document IDs to attach as context"),
});
export async function executeAddConversationMessage(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
) {
	const params = addConversationMessageParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);
	await client.addConversationMessage(params.conversation_id, {
		content: {
			_type: "user",
			content: [{ _type: "text", text: params.text }],
		},
		context: params.context,
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
