import { z } from "zod";
import type { components } from "./schema";

const objectIdSchema = z.object({ $oid: z.string() });

const timestampSchema = z.union([
	z.string(),
	z
		.object({
			$date: z.union([z.string(), z.object({ $numberLong: z.string() })]),
		})
		.transform((value) =>
			typeof value.$date === "string"
				? value.$date
				: new Date(Number(value.$date.$numberLong)).toISOString(),
		),
]);

// NOTE: Manually added — regenerate later from the backend conversation routes.
export const contextAttachmentSchema = z.discriminatedUnion("_type", [
	z.object({ _type: z.literal("document"), id: z.string() }),
	z.object({
		_type: z.literal("publication"),
		id: z.string(),
		version: z.string(),
	}),
	z.object({ _type: z.literal("file"), id: z.string() }),
]);
export type ContextAttachment = z.infer<typeof contextAttachmentSchema>;

export const messageContentSchema = z.discriminatedUnion("_type", [
	z.object({
		_type: z.literal("user"),
		content: z.array(z.object({ _type: z.literal("text"), text: z.string() })),
	}),
	z.object({
		_type: z.literal("assistant"),
		content: z.array(
			z.discriminatedUnion("_type", [
				z.object({ _type: z.literal("text"), text: z.string() }),
				z.object({ _type: z.literal("reasoning"), text: z.string() }),
				z.looseObject({ _type: z.literal("javaScriptExecution") }),
				z.looseObject({ _type: z.literal("cortexEvent") }),
			]),
		),
	}),
]);
export type MessageContent = z.infer<typeof messageContentSchema>;
export type MessageContentInput = z.input<typeof messageContentSchema>;

export const messageResponseSchema = z.object({
	_id: objectIdSchema,
	conversationId: objectIdSchema,
	content: messageContentSchema,
	context: z.array(objectIdSchema).optional(),
	richContext: z.array(contextAttachmentSchema),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
	deletedAt: timestampSchema.nullish(),
});
export type MessageView = z.output<typeof messageResponseSchema>;

const contextViewSchema = z.object({
	id: objectIdSchema,
	title: z.string().nullish(),
	content: z
		.looseObject({ _type: z.enum(["Text", "File", "Youtube", "Website"]) })
		.nullish(),
});
export type ContextView = z.output<typeof contextViewSchema>;

export const conversationSummarySchema = z.looseObject({
	_id: objectIdSchema,
	title: z.string(),
	ownerId: z.string(),
	pinned: z.boolean().nullish(),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
	richContext: z.array(contextAttachmentSchema),
});
export type ConversationSummary = z.output<typeof conversationSummarySchema>;

export const conversationViewSchema = z.object({
	_id: objectIdSchema,
	title: z.string(),
	ownerId: z.string(),
	pinned: z.boolean().nullish(),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
	context: z.array(contextViewSchema),
	messages: z.array(messageResponseSchema),
	richContext: z.array(contextAttachmentSchema),
	removedContext: z.array(objectIdSchema).optional(),
});
export type ConversationView = z.output<typeof conversationViewSchema>;

export const createConversationResponseSchema = z.object({
	conversation_id: z.string(),
});

export const addMessageResponseSchema = z.object({
	message: messageResponseSchema,
});

export interface CreateConversationRequest {
	/** Caller-supplied 24-hex conversation id. */
	id?: string;
	title?: string | null;
	context?: string[];
}

export interface UpdateConversationRequest {
	title?: string | null;
	pinned?: boolean | null;
	context?: string[] | null;
	removed_context?: string[] | null;
}

export interface AddMessageRequest {
	content: components["schemas"]["MessageContent"];
	context?: string[];
	agent_mode?: string | null;
}
