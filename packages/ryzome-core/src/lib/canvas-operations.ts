import { z } from "zod";
import type { PatchOperation } from "./client/index.js";
import { documentContentInputSchema } from "./document-content.js";
import { objectIdStringSchema } from "./ids.js";

/**
 * Zod mirror of the generated `CanvasOperation` union (see schema.d.ts).
 * Keep the variants and field names in lockstep with the backend spec.
 */

const connectionSideSchema = z.enum(["left", "right", "top", "bottom"]);

const newDocumentParamsSchema = z.object({
	id: objectIdStringSchema
		.optional()
		.describe("Optional 24-hex id for the new backing document"),
	title: z.string().nullish(),
	description: z.string().nullish(),
	generated: z.boolean().nullish(),
	tags: z.array(z.string()).nullish(),
	content: documentContentInputSchema.nullish(),
});

export const createNodeDataSchema = z.discriminatedUnion("_type", [
	z.object({
		_type: z.literal("Group"),
		_content: z.object({ title: z.string().nullish() }),
	}),
	z.object({
		_type: z.literal("ExistingDocument"),
		_content: z.object({ document_id: objectIdStringSchema }),
	}),
	z.object({
		_type: z.literal("NewDocument"),
		_content: newDocumentParamsSchema,
	}),
]);

export const canvasOperationSchema = z.discriminatedUnion("_type", [
	z.object({ _type: z.literal("setName"), name: z.string() }),
	z.object({
		_type: z.literal("createNode"),
		id: objectIdStringSchema
			.nullish()
			.describe("Optional 24-hex node id (generated when omitted)"),
		x: z.number(),
		y: z.number(),
		width: z.number(),
		height: z.number(),
		data: createNodeDataSchema.nullish(),
	}),
	z.object({
		_type: z.literal("setNodePosition"),
		id: z.string(),
		x: z.number(),
		y: z.number(),
	}),
	z.object({
		_type: z.literal("setNodeSize"),
		id: z.string(),
		width: z.number(),
		height: z.number(),
	}),
	z.object({
		_type: z.literal("setNodeTitle"),
		id: z.string(),
		title: z.string().nullish(),
	}),
	z.object({
		_type: z.literal("setNodeColor"),
		id: z.string(),
		color: z.string().nullish(),
	}),
	z.object({
		_type: z.literal("setNodeContent"),
		id: z.string(),
		content: documentContentInputSchema,
	}),
	z.object({
		_type: z.literal("appendNodeContent"),
		id: z.string(),
		content: z.string(),
	}),
	z.object({
		_type: z.literal("setNodeFavoriteState"),
		id: z.string(),
		isFavorite: z.boolean(),
	}),
	z.object({ _type: z.literal("deleteNode"), id: z.string() }),
	z.object({
		_type: z.literal("createEdge"),
		id: objectIdStringSchema
			.nullish()
			.describe("Optional 24-hex edge id (generated when omitted)"),
		fromNodeId: z.string(),
		fromSide: connectionSideSchema,
		toNodeId: z.string(),
		toSide: connectionSideSchema,
		label: z.string().nullish(),
	}),
	z.object({
		_type: z.literal("setEdgeLabel"),
		id: z.string(),
		label: z.string(),
	}),
	z.object({
		_type: z.literal("setEdgePosition"),
		id: z.string(),
		fromNodeId: z.string(),
		fromSide: connectionSideSchema,
		toNodeId: z.string(),
		toSide: connectionSideSchema,
	}),
	z.object({ _type: z.literal("deleteEdge"), id: z.string() }),
]);

export type CanvasOperationInput = z.infer<typeof canvasOperationSchema>;

/** The zod mirror is structurally compatible with the generated union. */
export function toPatchOperation(op: CanvasOperationInput): PatchOperation {
	return op as unknown as PatchOperation;
}
