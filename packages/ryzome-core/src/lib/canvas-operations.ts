import { z } from "zod";
import { documentContentInputSchema } from "./document-content.js";
import { objectIdStringSchema } from "./ids.js";

/**
 * Zod input for all generated `CanvasOperation` variants (see schema.d.ts).
 * Content payloads use the supported subset in document-content.ts.
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
		id: objectIdStringSchema,
		x: z.number(),
		y: z.number(),
	}),
	z.object({
		_type: z.literal("setNodeSize"),
		id: objectIdStringSchema,
		width: z.number(),
		height: z.number(),
	}),
	z.object({
		_type: z.literal("setNodeTitle"),
		id: objectIdStringSchema,
		title: z.string().nullish(),
	}),
	z.object({
		_type: z.literal("setNodeColor"),
		id: objectIdStringSchema,
		color: z.string().nullish(),
	}),
	z.object({
		_type: z.literal("setNodeContent"),
		id: objectIdStringSchema,
		content: documentContentInputSchema,
	}),
	z.object({
		_type: z.literal("appendNodeContent"),
		id: objectIdStringSchema,
		content: z.string(),
	}),
	z.object({
		_type: z.literal("setNodeFavoriteState"),
		id: objectIdStringSchema,
		isFavorite: z.boolean(),
	}),
	z.object({ _type: z.literal("deleteNode"), id: objectIdStringSchema }),
	z.object({
		_type: z.literal("createEdge"),
		id: objectIdStringSchema
			.nullish()
			.describe("Optional 24-hex edge id (generated when omitted)"),
		fromNodeId: objectIdStringSchema,
		fromSide: connectionSideSchema,
		toNodeId: objectIdStringSchema,
		toSide: connectionSideSchema,
		label: z.string().nullish(),
	}),
	z.object({
		_type: z.literal("setEdgeLabel"),
		id: objectIdStringSchema,
		label: z.string(),
	}),
	z.object({
		_type: z.literal("setEdgePosition"),
		id: objectIdStringSchema,
		fromNodeId: objectIdStringSchema,
		fromSide: connectionSideSchema,
		toNodeId: objectIdStringSchema,
		toSide: connectionSideSchema,
	}),
	z.object({ _type: z.literal("deleteEdge"), id: objectIdStringSchema }),
]);

export type CanvasOperationInput = z.infer<typeof canvasOperationSchema>;
