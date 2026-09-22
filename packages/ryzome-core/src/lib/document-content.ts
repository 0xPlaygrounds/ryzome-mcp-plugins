import { z } from "zod";
import type {
	DocumentContentView,
	DocumentOperation,
	DocumentView,
} from "./client/index.js";

const objectIdSchema = z.object({
	$oid: z.string(),
});

const messageRefSchema = z.object({
	conversationId: objectIdSchema,
	messageId: objectIdSchema,
});

const agentConfigSchema = z.object({
	prompt: z.string(),
	apiKeyId: z.string().nullable().optional(),
});

export const documentContentTypeSchema = z.enum([
	"Text",
	"File",
	"Youtube",
	"Website",
	"Canvas",
	"Bundle",
]);

const textDocumentContentSchema = z.object({
	_type: z.literal("Text"),
	_content: z.object({
		text: z.string().nullable().optional(),
		origin: messageRefSchema.nullish(),
		agentConfig: agentConfigSchema.nullish(),
	}),
});

const fileDocumentContentSchema = z.object({
	_type: z.literal("File"),
	_content: z.discriminatedUnion("_type", [
		z.object({
			_type: z.literal("s3Object"),
			key: z.string(),
			file_type: z.string(),
			download_url: z.string().optional().default(""),
		}),
		z.object({
			_type: z.literal("googleDriveObject"),
			id: z.string(),
			file_type: z.string(),
		}),
	]),
});

const youtubeDocumentContentSchema = z.object({
	_type: z.literal("Youtube"),
	_content: z.object({
		videoId: z.string(),
	}),
});

const websiteDocumentContentSchema = z.object({
	_type: z.literal("Website"),
	_content: z.object({
		url: z.string().url(),
	}),
});

const canvasDocumentContentSchema = z.object({
	_type: z.literal("Canvas"),
	_content: z.object({
		nodes: z
			.array(z.never())
			.max(0)
			.describe("Must be empty; add nodes with canvas tools"),
		edges: z
			.array(z.never())
			.max(0)
			.describe("Must be empty; add edges with canvas tools"),
	}),
});

// Deliberately scoped input. Bundle membership uses bundle tools; non-empty
// Canvas views are read models, not unvalidated mutation payloads.
export const documentContentInputSchema = z.discriminatedUnion("_type", [
	textDocumentContentSchema,
	fileDocumentContentSchema,
	youtubeDocumentContentSchema,
	websiteDocumentContentSchema,
	canvasDocumentContentSchema,
]);

export type DocumentContentInput = z.infer<typeof documentContentInputSchema>;

export const documentOperationInputSchema = z.discriminatedUnion("_type", [
	z.object({
		_type: z.literal("setTitle"),
		title: z.string(),
	}),
	z.object({
		_type: z.literal("setFavoriteState"),
		isFavorite: z.boolean(),
	}),
	z.object({
		_type: z.literal("setContent"),
		content: documentContentInputSchema,
	}),
	z.object({
		_type: z.literal("appendDocumentContent"),
		content: z.string(),
	}),
]);

export type DocumentOperationInput = z.infer<
	typeof documentOperationInputSchema
>;

export function toDocumentContentView(
	content: DocumentContentInput,
): Exclude<DocumentContentView, { _type: "Bundle" }> {
	return content;
}

export function toDocumentOperation(
	operation: DocumentOperationInput,
): DocumentOperation {
	if (operation._type === "setContent") {
		return {
			_type: operation._type,
			content: toDocumentContentView(operation.content),
		};
	}

	return operation;
}

export function getDocumentUrlType(
	document: Pick<DocumentView, "content">,
): string {
	return document.content._type;
}
