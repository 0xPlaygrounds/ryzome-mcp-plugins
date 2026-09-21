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
			_type: "Authorized" as const,
			_content: makeDocumentPayload(id, title, text),
		},
		...overrides,
	};
}

function makeDocumentPayload(id: string, title: string, text: string) {
	return {
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
	};
}

function makeNodeShell(id: string, data: Record<string, unknown>) {
	return {
		_id: { $oid: id },
		color: "#ffffff",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		height: 200,
		width: 320,
		x: 0,
		y: 0,
		data,
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
		expect(md).toContain(
			"> View: https://ryzome.ai/workspace?document=canvas123",
		);
	});

	it("should strip trailing slashes from appUrl", () => {
		const md = formatCanvasAsMarkdown(makeCanvas() as never, {
			appUrl: "https://ryzome.ai/",
		});
		expect(md).toContain(
			"> View: https://ryzome.ai/workspace?document=canvas123",
		);
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
				makeNodeShell("g1", {
					_type: "Authorized",
					_content: { _type: "Group", title: "Planning Phase" },
				}),
			],
		});

		const md = formatCanvasAsMarkdown(canvas as never);
		expect(md).toContain("### Planning Phase");
	});

	it("should render unavailable nodes with their access state instead of Untitled", () => {
		const canvas = makeCanvas({
			nodes: [
				makeTextNode("n1", "Visible", "Readable content"),
				makeNodeShell("n2", {
					_type: "NotFound",
					_content: { $oid: "doc-n2" },
				}),
				makeNodeShell("n3", {
					_type: "Unauthorized",
					_content: { $oid: "doc-n3" },
				}),
				makeNodeShell("n4", {
					_type: "Error",
					_content: { documentId: { $oid: "doc-n4" }, message: "boom" },
				}),
			],
			edges: [makeEdge("n1", "n2")],
		});

		const md = formatCanvasAsMarkdown(canvas as never);
		expect(md).toContain("## Nodes (4)");
		expect(md).toContain("### (unavailable: NotFound)");
		expect(md).toContain("### (unavailable: Unauthorized)");
		expect(md).toContain("### (unavailable: Error)");
		expect(md).not.toContain("Untitled");
		expect(md).toContain("- Visible → (unavailable: NotFound)");
	});

	it("should still format legacy flat node data", () => {
		const canvas = makeCanvas({
			nodes: [
				makeNodeShell("n1", makeDocumentPayload("n1", "Legacy", "Old shape")),
				makeNodeShell("g1", { _type: "Group", title: "Legacy Group" }),
			],
		});

		const md = formatCanvasAsMarkdown(canvas as never);
		expect(md).toContain("### Legacy");
		expect(md).toContain("Old shape");
		expect(md).toContain("### Legacy Group");
	});
});
