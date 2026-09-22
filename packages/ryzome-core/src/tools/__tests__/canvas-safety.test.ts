import { afterEach, expect, it, vi } from "vitest";
import { executeCreateCanvas } from "../create-canvas.js";
import { executeUpdateCanvas } from "../update-canvas.js";
import { executePlanCanvas } from "../plan-canvas.js";
import { executeResearchCanvas } from "../research-canvas.js";
import { canvasOperationSchema } from "../../lib/canvas-operations.js";

const canvasId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const nodeId = "bbbbbbbbbbbbbbbbbbbbbbbb";
const edgeId = "cccccccccccccccccccccccc";
const config = {
	apiKey: "test-only",
	apiUrl: "https://example.invalid",
	appUrl: "https://example.invalid",
};
afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

it.each([
	{ _type: "appendNodeContent", id: nodeId, content: "hello" },
	{ _type: "createNode", x: 0, y: 0, width: 100, height: 100 },
])("does not replay a committed mutation after response loss: $_type", async (operation) => {
	let commits = 0;
	const fetch = vi.fn(async () => {
		commits++;
		if (commits === 1) throw new TypeError("Response lost after commit");
		return new Response(null, { status: 200 });
	});
	vi.stubGlobal("fetch", fetch);
	await expect(
		executeUpdateCanvas(
			{ canvas_id: canvasId, operations: [operation] },
			config,
		),
	).rejects.toMatchObject({ canvasId });
	expect(commits).toBe(1);
});

it.each(
	["elk", "legacy"].flatMap((engine) =>
		["a", "__proto__", "constructor", "toString"].map((from) => ({
			engine,
			from,
		})),
	),
)("preserves parallel edges for $from with $engine", async ({
	engine,
	from,
}) => {
	vi.stubEnv("RYZOME_LAYOUT_ENGINE", engine);
	const requests: Array<{
		operations: Array<{ _type: string; id: string; label: string }>;
	}> = [];
	vi.stubGlobal(
		"fetch",
		vi.fn(async (request: Request) => {
			if (request.method === "POST")
				return Response.json({
					documents: [
						{
							_id: { $oid: canvasId },
							content: { _type: "Canvas", _content: { nodes: [], edges: [] } },
						},
					],
				});
			requests.push(await request.json());
			return new Response(null, { status: 200 });
		}),
	);
	await executeCreateCanvas(
		{
			title: "Edges",
			nodes: [
				{ id: from, title: "A", description: "A" },
				{ id: "b", title: "B", description: "B" },
			],
			edges: [
				{ id: edgeId, from, to: "b", label: "supports" },
				{ id: nodeId, from, to: "b", label: "contradicts" },
				{ from, to: "b" },
			],
		},
		config,
	);
	const edges = requests[0].operations.filter(
		(op) => op._type === "createEdge",
	);
	expect(edges.map((op) => op.label)).toEqual(["supports", "contradicts", ""]);
	expect(edges.map((op) => op.id)).toEqual([
		edgeId,
		nodeId,
		expect.stringMatching(/^[a-f0-9]{24}$/),
	]);
	expect(new Set(edges.map((op) => op.id)).size).toBe(3);
});

it.each(
	[
		[
			{ id: "a", nodeId },
			{ id: "b", nodeId: nodeId.toUpperCase() },
		],
		[{ id: "a", nodeId: canvasId.toUpperCase() }],
		[{ id: "a" }, { id: "a" }],
		[
			{ id: "a", nodeId },
			{ id: "b", documentId: nodeId.toUpperCase() },
		],
		[{ id: "a", documentId: canvasId.toUpperCase() }],
	].map((nodes) => ({ nodes })),
)("rejects graph identity collisions before creating any document: $nodes", async ({
	nodes,
}) => {
	const fetch = vi.fn();
	vi.stubGlobal("fetch", fetch);
	await expect(
		executeCreateCanvas(
			{
				id: canvasId,
				title: "Bad",
				nodes: nodes.map((node) => ({
					...node,
					title: "Node",
					description: "Body",
				})),
			},
			config,
		),
	).rejects.toThrow(/duplicate|collision/i);
	expect(fetch).not.toHaveBeenCalled();
});

it("preflights caller IDs in plan and research too", async () => {
	const fetch = vi.fn();
	vi.stubGlobal("fetch", fetch);
	const steps = [
		{ id: "a", nodeId, title: "A", description: "A" },
		{ id: "b", nodeId, title: "B", description: "B" },
	];
	await expect(
		executePlanCanvas({ title: "Plan", steps }, config),
	).rejects.toThrow(/duplicate/i);
	await expect(
		executeResearchCanvas(
			{ title: "Research", topic: "Topic", findings: steps },
			config,
		),
	).rejects.toThrow(/duplicate/i);
	expect(fetch).not.toHaveBeenCalled();
});

it("rejects duplicate edge IDs before creating any document", async () => {
	const fetch = vi.fn();
	vi.stubGlobal("fetch", fetch);
	await expect(
		executeCreateCanvas(
			{
				title: "Bad",
				nodes: [
					{ id: "a", title: "A", description: "A" },
					{ id: "b", title: "B", description: "B" },
				],
				edges: [
					{ id: edgeId, from: "a", to: "b" },
					{ id: edgeId.toUpperCase(), from: "b", to: "a" },
				],
			},
			config,
		),
	).rejects.toThrow(/duplicate/i);
	expect(fetch).not.toHaveBeenCalled();
});

it("rejects malformed nested content and invalid target IDs", () => {
	expect(
		canvasOperationSchema.safeParse({
			_type: "setNodeContent",
			id: nodeId,
			content: { _type: "Canvas", _content: { nodes: [123], edges: ["bad"] } },
		}).success,
	).toBe(false);
	expect(
		canvasOperationSchema.safeParse({ _type: "deleteNode", id: "not-an-id" })
			.success,
	).toBe(false);
});
