import { describe, expect, it } from "vitest";
import { formatDocumentAsMarkdown } from "../format-document-markdown.js";

function makeTextDocument(overrides: Record<string, unknown> = {}) {
	return {
		_id: { $oid: "doc123" },
		title: "Spec",
		description: "Working draft",
		content: {
			_type: "Text" as const,
			_content: {
				text: "Hello world",
			},
		},
		generated: false,
		inLibrary: true,
		isFavorite: false,
		ownerId: "owner1",
		tags: ["draft"],
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

describe("formatDocumentAsMarkdown", () => {
	it("formats text documents with a document view link", () => {
		const markdown = formatDocumentAsMarkdown(makeTextDocument() as never, {
			appUrl: "https://ryzome.ai",
		});

		expect(markdown).toContain("# Spec");
		expect(markdown).toContain("> Type: Text");
		expect(markdown).toContain("> View: https://ryzome.ai/workspace?document=doc123");
		expect(markdown).toContain("Hello world");
		expect(markdown).toContain("> Tags: draft");
	});

	it("formats canvas documents through the canvas formatter", () => {
		const markdown = formatDocumentAsMarkdown(
			makeTextDocument({
				title: "Canvas doc",
				content: {
					_type: "Canvas",
					_content: {
						nodes: [],
						edges: [],
					},
				},
			}) as never,
			{
				appUrl: "https://ryzome.ai",
			},
		);

		expect(markdown).toContain("# Canvas doc");
		expect(markdown).toContain("> View: https://ryzome.ai/workspace?canvas=doc123");
	});
});
