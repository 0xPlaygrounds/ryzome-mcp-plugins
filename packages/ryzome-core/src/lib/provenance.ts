import { z } from "zod";

export const provenanceSchema = z
	.object({
		tags: z
			.array(z.string())
			.optional()
			.describe("Tags appended to the created document (deduplicated)"),
		header: z
			.string()
			.optional()
			.describe(
				"Line prepended to Text content, followed by a blank line (documents and new canvas nodes)",
			),
	})
	.describe("Provenance metadata stamped onto created documents");

export type ProvenanceInput = z.infer<typeof provenanceSchema>;

/** Append `extra` to `base`, dropping duplicates and blank entries. */
export function mergeTags(
	base: readonly string[] | null | undefined,
	extra: readonly string[] | null | undefined,
): string[] | undefined {
	if (!base?.length && !extra?.length) return base ? [...base] : undefined;
	const seen = new Set<string>();
	const merged: string[] = [];
	for (const tag of [...(base ?? []), ...(extra ?? [])]) {
		const trimmed = tag.trim();
		if (!trimmed || seen.has(trimmed)) continue;
		seen.add(trimmed);
		merged.push(trimmed);
	}
	return merged;
}

/** Prepend `header` as the first line of `text`, separated by a blank line. */
export function applyHeader(
	text: string | null | undefined,
	header: string | undefined,
): string | null | undefined {
	const trimmedHeader = header?.trim();
	if (!trimmedHeader) return text;
	const body = text ?? "";
	return body ? `${trimmedHeader}\n\n${body}` : trimmedHeader;
}
