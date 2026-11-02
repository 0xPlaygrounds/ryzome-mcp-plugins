import { z } from "zod";
import type { components } from "./schema";

const objectIdSchema = z.object({ $oid: z.string() });
const memberMetadataSchema = z.looseObject({
	_id: objectIdSchema,
	title: z.string().nullish(),
	content: z.looseObject({ _type: z.string() }),
});
export const bundleMemberSchema = z.discriminatedUnion("_type", [
	z.object({ _type: z.literal("Authorized"), _content: memberMetadataSchema }),
	z.object({ _type: z.literal("NotFound"), _content: objectIdSchema }),
	z.object({ _type: z.literal("Unauthorized"), _content: objectIdSchema }),
	z.object({
		_type: z.literal("Error"),
		_content: z.object({ documentId: objectIdSchema, message: z.string() }),
	}),
]);
export const bundleContentSchema = z.object({
	_type: z.literal("Bundle"),
	_content: z.object({ documentsMetadata: z.array(bundleMemberSchema) }),
});
export const bundleDocumentSchema = z.looseObject({
	_id: objectIdSchema,
	title: z.string().nullish(),
	description: z.string().nullish(),
	tags: z.array(z.string()).optional(),
	content: bundleContentSchema,
});
export type BundleDocument = z.infer<typeof bundleDocumentSchema>;
export type BundleContent = z.infer<typeof bundleContentSchema>;
export type CreateBundleContent = Extract<
	components["schemas"]["CreateDocumentContentView"],
	{ _type: "Bundle" }
>;
export const bundleOperationSchema = z.discriminatedUnion("_type", [
	z.object({
		_type: z.literal("addDocument"),
		id: z.string().regex(/^[a-fA-F0-9]{24}$/),
		position: z.number().int().nonnegative().optional(),
	}),
	z.object({
		_type: z.literal("removeDocument"),
		id: z.string().regex(/^[a-fA-F0-9]{24}$/),
	}),
	z.object({
		_type: z.literal("reorderDocuments"),
		ids: z.array(z.string().regex(/^[a-fA-F0-9]{24}$/)),
	}),
]);
export type BundleOperation = z.infer<typeof bundleOperationSchema>;
export type PatchBundleRequest = { operations: BundleOperation[] };
export const patchBundleResponseSchema = z.object({
	num_success: z.number().int().nonnegative(),
});
