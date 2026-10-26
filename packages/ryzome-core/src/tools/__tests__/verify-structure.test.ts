import { ZodError } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { executeVerifyStructure } from "../verify-structure.js";

const rootId = "0123456789abcdef01234567";
const config = {
	apiKey: "test-key",
	apiUrl: "https://api.example.com",
	appUrl: "https://app.example.com",
};

function response(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

const documentNode = (id: string, docId: string, title: string) => ({
	_id: { $oid: id },
	color: "#FFFFFF",
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
	x: 0,
	y: 0,
	width: 320,
	height: 180,
	data: {
		_type: "Authorized",
		_content: {
			_type: "Document",
			_id: { $oid: docId },
			title,
			content: { _type: "Text", _content: { text: "hi" } },
			generated: true,
			inLibrary: false,
			pinned: false,
			ownerId: "owner",
			tags: [],
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		},
	},
});

const edge = (id: string, from: string, to: string, label: string) => ({
	_id: { $oid: id },
	color: "#000000",
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
	fromNode: { $oid: from },
	fromSide: "bottom",
	toNode: { $oid: to },
	toSide: "top",
	label,
});

const canvasFixture = {
	_id: { $oid: rootId },
	title: "Research map",
	content: {
		_type: "Canvas",
		_content: {
			nodes: [
				documentNode(
					"1123456789abcdef01234567",
					"a123456789abcdef01234567",
					"Intro",
				),
				documentNode(
					"2123456789abcdef01234567",
					"b123456789abcdef01234567",
					"Method",
				),
				{
					_id: { $oid: "3123456789abcdef01234567" },
					color: "#EEEEEE",
					createdAt: "2026-01-01T00:00:00Z",
					updatedAt: "2026-01-01T00:00:00Z",
					x: 0,
					y: 0,
					width: 800,
					height: 600,
					data: {
						_type: "Authorized",
						_content: { _type: "Group", title: "Frame" },
					},
				},
				{
					_id: { $oid: "4123456789abcdef01234567" },
					color: "#FFFFFF",
					createdAt: "2026-01-01T00:00:00Z",
					updatedAt: "2026-01-01T00:00:00Z",
					x: 0,
					y: 0,
					width: 320,
					height: 180,
					data: {
						_type: "NotFound",
						_content: { $oid: "c123456789abcdef01234567" },
					},
				},
				{
					_id: { $oid: "5123456789abcdef01234567" },
					color: "#FFFFFF",
					createdAt: "2026-01-01T00:00:00Z",
					updatedAt: "2026-01-01T00:00:00Z",
					x: 0,
					y: 0,
					width: 320,
					height: 180,
					data: {
						_type: "Error",
						_content: {
							documentId: { $oid: "d123456789abcdef01234567" },
							message: "backend hiccup",
						},
					},
				},
			],
			edges: [
				edge(
					"6123456789abcdef01234567",
					"1123456789abcdef01234567",
					"2123456789abcdef01234567",
					"leads to",
				),
				edge(
					"7123456789abcdef01234567",
					"2123456789abcdef01234567",
					"4123456789abcdef01234567",
					"",
				),
				edge(
					"8123456789abcdef01234567",
					"1123456789abcdef01234567",
					"9999999999abcdef01234567",
					"dangling",
				),
			],
		},
	},
	generated: false,
	inLibrary: true,
	pinned: false,
	ownerId: "owner",
	tags: [],
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

const bundleFixture = {
	_id: { $oid: rootId },
	title: "Reading list",
	ownerId: "owner",
	tags: [],
	content: {
		_type: "Bundle",
		_content: {
			documentsMetadata: [
				{
					_type: "Authorized",
					_content: {
						_id: { $oid: "a123456789abcdef01234567" },
						title: "Notes",
						content: { _type: "Text" },
					},
				},
				{
					_type: "Unauthorized",
					_content: { $oid: "b123456789abcdef01234567" },
				},
				{ _type: "NotFound", _content: { $oid: "c123456789abcdef01234567" } },
				{
					_type: "Error",
					_content: {
						documentId: { $oid: "d123456789abcdef01234567" },
						message: "Unavailable",
					},
				},
			],
		},
	},
};

afterEach(() => vi.unstubAllGlobals());

describe("verify_ryzome_structure", () => {
	it("walks a canvas and reports unavailable nodes and edge problems without writing", async () => {
		const fetch = vi.fn().mockResolvedValue(response(canvasFixture));
		vi.stubGlobal("fetch", fetch);

		const result = await executeVerifyStructure(
			{ document_id: rootId },
			config,
		);

		expect(fetch).toHaveBeenCalledOnce();
		const request = fetch.mock.calls[0][0] as Request;
		expect(request.method).toBe("GET");
		expect(request.url).toBe(`https://api.example.com/v1/document/${rootId}`);

		expect(result.structuredContent).toEqual({
			kind: "Canvas",
			id: rootId,
			title: "Research map",
			nodeCount: 5,
			documentNodeCount: 2,
			groupNodeCount: 1,
			edgeCount: 3,
			unavailable: [
				{
					id: "4123456789abcdef01234567",
					state: "NotFound",
					documentId: "c123456789abcdef01234567",
				},
				{
					id: "5123456789abcdef01234567",
					state: "Error",
					documentId: "d123456789abcdef01234567",
					message: "backend hiccup",
				},
			],
			edgesMissingLabels: [
				{
					id: "7123456789abcdef01234567",
					from: "2123456789abcdef01234567",
					to: "4123456789abcdef01234567",
				},
			],
			edgesWithUnknownNodes: [
				{
					id: "8123456789abcdef01234567",
					from: "1123456789abcdef01234567",
					to: "9999999999abcdef01234567",
					unknown: ["to"],
				},
			],
		});

		const text = result.content[0].text;
		expect(text).toContain("Kind: Canvas");
		expect(text).toContain(
			"Nodes: 5 (documents: 2, groups: 1, unavailable: 2)",
		);
		expect(text).toContain("Edges: 3");
		expect(text).toContain("4123456789abcdef01234567: NotFound");
		expect(text).toContain("backend hiccup");
		expect(text).toContain("Advisory: edges missing optional labels:");
		expect(text).toContain("Edges referencing unknown node ids:");
		expect(text).toContain("(unknown: to)");
		expect(text).toContain("Issues: 3");
	});

	it("walks a bundle's access states", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(bundleFixture)));

		const result = await executeVerifyStructure(
			{ document_id: rootId },
			config,
		);

		expect(result.structuredContent).toEqual({
			kind: "Bundle",
			id: rootId,
			title: "Reading list",
			memberCount: 4,
			availableCount: 1,
			unavailable: [
				{ id: "b123456789abcdef01234567", state: "Unauthorized" },
				{ id: "c123456789abcdef01234567", state: "NotFound" },
				{
					id: "d123456789abcdef01234567",
					state: "Error",
					message: "Unavailable",
				},
			],
		});
		const text = result.content[0].text;
		expect(text).toContain("Kind: Bundle");
		expect(text).toContain("Members: 4 (available: 1, unavailable: 3)");
		expect(text).toContain("Issues: 3");
	});

	it("reports a clean canvas as OK", async () => {
		const clean = {
			...canvasFixture,
			content: {
				_type: "Canvas",
				_content: {
					nodes: canvasFixture.content._content.nodes.slice(0, 2),
					edges: canvasFixture.content._content.edges
						.slice(0, 1)
						.map((edge) => ({ ...edge, label: "" })),
				},
			},
		};
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(clean)));
		const result = await executeVerifyStructure(
			{ document_id: rootId },
			config,
		);
		expect(result.content[0].text).toContain("OK: all nodes readable");
	});

	it("declines to verify non-container documents", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				response({
					...canvasFixture,
					content: { _type: "Text", _content: { text: "plain" } },
				}),
			),
		);
		const result = await executeVerifyStructure(
			{ document_id: rootId },
			config,
		);
		expect(result.structuredContent).toMatchObject({
			kind: "Text",
			verifiable: false,
		});
		expect(result.content[0].text).toContain("nothing to verify");
	});

	it("rejects malformed root ids before making a request", async () => {
		const fetch = vi.fn();
		vi.stubGlobal("fetch", fetch);
		await expect(
			executeVerifyStructure({ document_id: "nope" }, config),
		).rejects.toThrow(ZodError);
		expect(fetch).not.toHaveBeenCalled();
	});
});
