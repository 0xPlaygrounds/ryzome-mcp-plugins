import type { ContextView, MessageView } from "./client/conversation.js";

export function buildConversationAppUrl(
	appUrl: string,
	conversationId: string,
): string {
	const appBase = appUrl.replace(/\/+$/, "");
	return `${appBase}/workspace?conversation=${encodeURIComponent(conversationId)}`;
}

function formatContextTitle(context: ContextView): string {
	return context.title ?? context.id.$oid;
}

function formatMessageText(message: MessageView): string {
	if (message.content._type === "user") {
		return message.content.content
			.map((part) => part.text)
			.join("\n")
			.trim();
	}
	return message.content.content
		.filter((part) => part._type === "text" || part._type === "reasoning")
		.map((part) =>
			part._type === "reasoning" ? `_[reasoning]_ ${part.text}` : part.text,
		)
		.join("\n")
		.trim();
}

export function formatConversationAsMarkdown(
	conversation: {
		_id: { $oid: string };
		title: string;
		pinned?: boolean | null;
		createdAt?: unknown;
		updatedAt?: unknown;
		context: ContextView[];
		messages: MessageView[];
		richContext?: unknown;
	},
	opts?: { appUrl?: string },
): string {
	const lines = [`# ${conversation.title}`, `ID: ${conversation._id.$oid}`];
	if (opts?.appUrl)
		lines.push(
			`View: ${buildConversationAppUrl(opts.appUrl, conversation._id.$oid)}`,
		);
	if (conversation.pinned) lines.push("Pinned: yes");

	if (conversation.context.length) {
		lines.push("", "## Context");
		for (const context of conversation.context) {
			lines.push(`- ${formatContextTitle(context)}`);
		}
	}

	lines.push("", `## Messages (${conversation.messages.length})`);
	for (const message of conversation.messages) {
		const role = message.content._type === "user" ? "User" : "Assistant";
		lines.push("", `### ${role}`);
		const text = formatMessageText(message);
		lines.push(text || "[no text content]");
	}

	return lines.join("\n");
}
