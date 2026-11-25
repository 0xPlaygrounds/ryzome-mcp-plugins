import { documentContentTypeSchema } from "../document-content.js";
import { z } from "zod";

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

// NOTE: Manually added — regenerate later from the backend document routes.
// GET /document returns metadata, not full document content.
export const documentListResponseSchema = z.object({
	documents: z.array(
		z.looseObject({
			_id: z.object({ $oid: z.string() }),
			title: z.string().nullish(),
			description: z.string().nullish(),
			content: z.looseObject({
				// A type the backend adds later is kept instead of failing the whole list.
				_type: z.union([documentContentTypeSchema, z.string()]),
			}),
			pinned: z.boolean(),
			inLibrary: z.boolean(),
			tags: z.array(z.string()),
			createdAt: timestampSchema,
			updatedAt: timestampSchema,
		}),
	),
});

export type DocumentListResponse = z.input<typeof documentListResponseSchema>;
export type DocumentListItem = z.output<
	typeof documentListResponseSchema
>["documents"][number] & {
	isFavorite: boolean;
};
