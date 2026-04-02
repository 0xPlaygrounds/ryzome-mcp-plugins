import { describe, expect, it } from "vitest";
import { formatCanvasAsMarkdown } from "../format-canvas-markdown.js";

function makeCanvas(overrides: Record<string, unknown> = {}) {
	return {
		_id: { $oid: "canvas123" },
		name: "Test Canvas",
		description: null as string | null,
		isTemplate: false,
		ownerId: "owner1",
		nodes: [] as Array<Record<string, unknown>>,
		edges: [] as Array<Record<string, unknown>>,
		...overrides,
	};
}

function makeTextNode(
	id: string,
	title: string,
	text: string,
	overrides: Record<string, unknown> = {},
) {
	return {
		_id: { $oid: id },
		color: "#ffffff",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		height: 200,
		width: 320,
		x: 0,
		y: 0,
		data: {
			_type: "Document" as const,
			_id: { $oid: `doc-${id}` },
			content: {
				_type: "Text" as const,
				_content: { text },
			},
			title,
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
			generated: true,
			ownerId: "owner1",
		},
		...overrides,
	};
}

function makeEdge(fromId: string, toId: string, label = "") {
	return {
		_id: { $oid: `edge-${fromId}-${toId}` },
		color: "#000000",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		fromNode: { $oid: fromId },
		fromSide: "bottom" as const,
		toNode: { $oid: toId },
		toSide: "top" as const,
		label,
	};
}

describe("formatCanvasAsMarkdown", () => {
	it("should format an empty canvas with just the title", () => {
		const md = formatCanvasAsMarkdown(makeCanvas() as never);
		expect(md).toBe("# Test Canvas");
	});

	it("should include description when present", () => {
		const md = formatCanvasAsMarkdown(
			makeCanvas({ description: "A test canvas for unit tests" }) as never,
		);
		expect(md).toContain("# Test Canvas");
		expect(md).toContain("A test canvas for unit tests");
	});

	it("should include view link when appUrl is provided", () => {
		const md = formatCanvasAsMarkdown(makeCanvas() as never, {
			appUrl: "https://ryzome.ai",
		});
		expect(md).toContain("> View: https://ryzome.ai/canvas/canvas123");
	});

	it("should strip trailing slashes from appUrl", () => {
		const md = formatCanvasAsMarkdown(makeCanvas() as never, {
			appUrl: "https://ryzome.ai/",
		});
		expect(md).toContain("> View: https://ryzome.ai/canvas/canvas123");
	});

	it("should format nodes with titles and content", () => {
		const canvas = makeCanvas({
			nodes: [
				makeTextNode("n1", "Research", "Gather data from multiple sources"),
				makeTextNode("n2", "Analysis", "Analyze the collected data"),
			],
		});

		const md = formatCanvasAsMarkdown(canvas as never);
		expect(md).toContain("## Nodes (2)");
		expect(md).toContain("### Research");
		expect(md).toContain("Gather data from multiple sources");
		expect(md).toContain("### Analysis");
		expect(md).toContain("Analyze the collected data");
	});

	it("should format edges with node titles", () => {
		const canvas = makeCanvas({
			nodes: [
				makeTextNode("n1", "Research", "First step"),
				makeTextNode("n2", "Analysis", "Second step"),
			],
			edges: [makeEdge("n1", "n2")],
		});

		const md = formatCanvasAsMarkdown(canvas as never);
		expect(md).toContain("## Connections (1)");
		expect(md).toContain("- Research → Analysis");
	});

	it("should include edge labels when present", () => {
		const canvas = makeCanvas({
			nodes: [
				makeTextNode("n1", "Start", "Begin"),
				makeTextNode("n2", "End", "Finish"),
			],
			edges: [makeEdge("n1", "n2", "depends on")],
		});

		const md = formatCanvasAsMarkdown(canvas as never);
		expect(md).toContain("- Start → End (depends on)");
	});

	it("should use node ID for edges when node title is not found", () => {
		const canvas = makeCanvas({
			nodes: [makeTextNode("n1", "Start", "Begin")],
			edges: [makeEdge("n1", "unknown-id")],
		});

		const md = formatCanvasAsMarkdown(canvas as never);
		expect(md).toContain("- Start → unknown-id");
	});

	it("should handle group nodes", () => {
		const canvas = makeCanvas({
			nodes: [
				{
					_id: { $oid: "g1" },
					color: "#ffffff",
					createdAt: "2026-01-01T00:00:00Z",
					updatedAt: "2026-01-01T00:00:00Z",
					height: 400,
					width: 600,
					x: 0,
					y: 0,
					data: {
						_type: "Group" as const,
						title: "Planning Phase",
					},
				},
			],
		});

		const md = formatCanvasAsMarkdown(canvas as never);
		expect(md).toContain("### Planning Phase");
	});
});
