import { afterEach, describe, expect, it, vi } from "vitest";
import { canvasOperationSchema } from "../../lib/canvas-operations.js";
import {
	executeUpdateCanvas,
	updateCanvasParamsSchema,
} from "../update-canvas.js";

const canvasId = "0123456789abcdef01234567";
const nodeId = "1123456789abcdef01234567";
const otherNodeId = "2123456789abcdef01234567";
const edgeId = "3123456789abcdef01234567";
const documentId = "4123456789abcdef01234567";
const config = {
	apiKey: "test-key",
	apiUrl: "https://api.example.com",
	appUrl: "https://app.example.com",
};

const everyOperation = [
	{ _type: "setName", name: "Renamed" },
	{
		_type: "createNode",
		id: nodeId,
		x: 0,
		y: 0,
		width: 320,
		height: 180,
		data: { _type: "Group", _content: { title: "Frame" } },
	},
	{
		_type: "createNode",
		x: 10,
		y: 10,
		width: 320,
		height: 180,
		data: { _type: "ExistingDocument", _content: { document_id: documentId } },
	},
	{
		_type: "createNode",
		id: otherNodeId,
		x: 20,
		y: 20,
		width: 320,
		height: 180,
		data: {
			_type: "NewDocument",
			_content: {
				title: "Fresh",
				generated: true,
				tags: ["agent"],
				content: { _type: "Text", _content: { text: "Body" } },
			},
		},
	},
	{ _type: "setNodePosition", id: nodeId, x: 5, y: 6 },
	{ _type: "setNodeSize", id: nodeId, width: 400, height: 300 },
	{ _type: "setNodeTitle", id: nodeId, title: "Retitled" },
	{ _type: "setNodeColor", id: nodeId, color: "#FF6B6B" },
	{
		_type: "setNodeContent",
		id: otherNodeId,
		content: { _type: "Website", _content: { url: "https://example.com" } },
	},
	{ _type: "appendNodeContent", id: otherNodeId, content: "\nMore" },
	{ _type: "setNodeFavoriteState", id: nodeId, isFavorite: true },
	{ _type: "deleteNode", id: nodeId },
	{
		_type: "createEdge",
		id: edgeId,
		fromNodeId: nodeId,
		fromSide: "bottom",
		toNodeId: otherNodeId,
		toSide: "top",
		label: "leads to",
	},
	{ _type: "setEdgeLabel", id: edgeId, label: "relabeled" },
	{
		_type: "setEdgePosition",
		id: edgeId,
		fromNodeId: otherNodeId,
		fromSide: "right",
		toNodeId: nodeId,
		toSide: "left",
	},
	{ _type: "deleteEdge", id: edgeId },
];

afterEach(() => vi.unstubAllGlobals());

describe("update_ryzome_canvas", () => {
	it("accepts every CanvasOperation variant through the zod mirror", () => {
		const variants = new Set(
			everyOperation.map((op) => canvasOperationSchema.parse(op)._type),
		);
		expect([...variants].sort()).toEqual(
			[
				"setName",
				"createNode",
				"setNodePosition",
				"setNodeSize",
				"setNodeTitle",
				"setNodeColor",
				"setNodeContent",
				"appendNodeContent",
				"setNodeFavoriteState",
				"deleteNode",
				"createEdge",
				"setEdgeLabel",
				"setEdgePosition",
				"deleteEdge",
			].sort(),
		);
	});

	it("rejects unknown operation types, bad ids, and empty operation lists", () => {
		expect(() =>
			canvasOperationSchema.parse({ _type: "explode", id: nodeId }),
		).toThrow();
		expect(() =>
			canvasOperationSchema.parse({
				_type: "createNode",
				id: "not-hex",
				x: 0,
				y: 0,
				width: 1,
				height: 1,
			}),
		).toThrow();
		expect(() =>
			updateCanvasParamsSchema.parse({ canvasId, operations: [] }),
		).toThrow();
		expect(() =>
			updateCanvasParamsSchema.parse({
				canvasId: "short",
				operations: [{ _type: "setName", name: "x" }],
			}),
		).toThrow();
	});

	it("sends the operations verbatim in a single PATCH and reports the applied count", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(new Response("{}", { status: 200 }));
		vi.stubGlobal("fetch", fetch);

		const result = await executeUpdateCanvas(
			{ canvasId, operations: everyOperation },
			config,
		);

		expect(fetch).toHaveBeenCalledOnce();
		const request = fetch.mock.calls[0][0] as Request;
		expect(request.method).toBe("PATCH");
		expect(request.url).toBe(`https://api.example.com/v1/canvas/${canvasId}`);
		expect(request.headers.get("x-api-key")).toBe("test-key");
		expect(await request.json()).toEqual({ operations: everyOperation });

		expect(result.structuredContent).toEqual({
			canvasId,
			applied: everyOperation.length,
			url: `https://app.example.com/workspace?document=${canvasId}`,
		});
		expect(result.content[0].text).toContain(
			`View: https://app.example.com/workspace?document=${canvasId}`,
		);
		expect(result.content[0].text).toContain(
			`Applied: ${everyOperation.length} operations`,
		);
	});

	it("surfaces non-retryable API failures", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("nope", { status: 400 })),
		);
		await expect(
			executeUpdateCanvas(
				{ canvasId, operations: [{ _type: "setName", name: "x" }] },
				config,
			),
		).rejects.toMatchObject({ stage: "patchCanvas", status: 400 });
	});
});
