import { ZodError } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyHeader, mergeTags } from "../../lib/provenance.js";
import { executeCreateBundle } from "../create-bundle.js";
import { executeCreateCanvas } from "../create-canvas.js";
import { executeCreateConversation } from "../create-conversation.js";
import { executeCreateDocument } from "../create-document.js";
import { executePlanCanvas } from "../plan-canvas.js";
import { executeResearchCanvas } from "../research-canvas.js";

const config = {
	apiKey: "test-key",
	apiUrl: "https://api.example.com",
	appUrl: "https://app.example.com",
};
const suppliedId = "abcdefabcdefabcdefabcdef";
const nodeA = "111111111111111111111111";
const nodeB = "222222222222222222222222";
const edgeId = "333333333333333333333333";
const existingDoc = "444444444444444444444444";

function response(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function documentView(overrides: Record<string, unknown>) {
	return {
		_id: { $oid: suppliedId },
		title: "Doc",
		content: { _type: "Text", _content: { text: "hi" } },
		generated: false,
		inLibrary: true,
		pinned: false,
		ownerId: "owner",
		tags: [],
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

async function bodyOf(fetch: ReturnType<typeof vi.fn>, call = 0) {
	const request = fetch.mock.calls[call][0] as Request;
	return { request, body: await request.json() };
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("caller-supplied ids", () => {
	it("create_ryzome_document sends id as _id", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(response({ documents: [documentView({})] }));
		vi.stubGlobal("fetch", fetch);

		await executeCreateDocument(
			{
				id: suppliedId,
				title: "Doc",
				content: { _type: "Text", _content: { text: "hi" } },
			},
			config,
		);

		const { body } = await bodyOf(fetch);
		expect(body.documents[0]._id).toBe(suppliedId);
	});

	it("create_ryzome_canvas sends the canvas id as _id and honors node/edge ids", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(
				response({
					documents: [
						documentView({
							content: { _type: "Canvas", _content: { nodes: [], edges: [] } },
						}),
					],
				}),
			)
			.mockResolvedValueOnce(new Response("{}", { status: 200 }));
		vi.stubGlobal("fetch", fetch);

		const result = await executeCreateCanvas(
			{
				id: suppliedId,
				title: "Board",
				nodes: [
					{ id: "a", nodeId: nodeA, title: "A", description: "First" },
					{ id: "b", nodeId: nodeB, documentId: existingDoc },
				],
				edges: [{ id: edgeId, from: "a", to: "b", label: "cites" }],
			},
			config,
		);

		const create = await bodyOf(fetch, 0);
		expect(create.body.documents[0]._id).toBe(suppliedId);

		const patch = await bodyOf(fetch, 1);
		expect(patch.request.url).toBe(
			`https://api.example.com/v1/canvas/${suppliedId}`,
		);
		const ops = patch.body.operations as Array<Record<string, unknown>>;
		expect(
			ops.filter((o) => o._type === "createNode").map((o) => o.id),
		).toEqual([nodeA, nodeB]);
		expect(ops.find((o) => o._type === "createEdge")).toMatchObject({
			id: edgeId,
			fromNodeId: nodeA,
			toNodeId: nodeB,
			label: "cites",
		});
		expect(result.structuredContent).toMatchObject({
			id: suppliedId,
			nodeCount: 2,
			edgeCount: 1,
		});
	});

	it("create_ryzome_plan and create_ryzome_research pass ids through", async () => {
		const fetch = vi.fn(async (request: Request) =>
			request.method === "POST"
				? response({
						documents: [
							documentView({
								content: {
									_type: "Canvas",
									_content: { nodes: [], edges: [] },
								},
							}),
						],
					})
				: new Response(null, { status: 200 }),
		);
		vi.stubGlobal("fetch", fetch);

		await executePlanCanvas(
			{
				id: suppliedId,
				title: "Plan",
				steps: [{ title: "S1", description: "d", nodeId: nodeA }],
			},
			config,
		);
		expect((await bodyOf(fetch, 0)).body.documents[0]._id).toBe(suppliedId);
		expect((await bodyOf(fetch, 1)).body.operations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ _type: "createNode", id: nodeA }),
			]),
		);

		await executeResearchCanvas(
			{
				id: suppliedId,
				title: "Research",
				topic: "T",
				findings: [{ id: "f", title: "F", description: "d", nodeId: nodeB }],
			},
			config,
		);
		expect((await bodyOf(fetch, 2)).body.documents[0]._id).toBe(suppliedId);
		expect((await bodyOf(fetch, 3)).body.operations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ _type: "createNode", id: nodeB }),
			]),
		);
	});

	it("create_ryzome_bundle sends id as _id", async () => {
		const fetch = vi.fn().mockResolvedValue(
			response({
				documents: [
					documentView({
						content: { _type: "Bundle", _content: { documentsMetadata: [] } },
					}),
				],
			}),
		);
		vi.stubGlobal("fetch", fetch);

		await executeCreateBundle({ id: suppliedId, title: "Pack" }, config);

		const { body } = await bodyOf(fetch);
		expect(body.documents[0]).toMatchObject({ _id: suppliedId, title: "Pack" });
	});

	it("create_ryzome_conversation sends id in the request body", async () => {
		const date = { $date: { $numberLong: "1767225600000" } };
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(response({ conversation_id: suppliedId }))
			.mockResolvedValueOnce(
				response({
					_id: { $oid: suppliedId },
					title: "Thread",
					ownerId: "owner",
					createdAt: date,
					updatedAt: date,
					context: [],
					messages: [],
					richContext: [],
				}),
			);
		vi.stubGlobal("fetch", fetch);

		await executeCreateConversation(
			{ id: suppliedId, title: "Thread" },
			config,
		);

		const { request, body } = await bodyOf(fetch);
		expect(request.url).toBe("https://api.example.com/v1/conversation");
		expect(body).toEqual({ id: suppliedId, title: "Thread" });
	});

	it("rejects ids that are not 24-hex", async () => {
		const fetch = vi.fn();
		vi.stubGlobal("fetch", fetch);
		await expect(
			executeCreateDocument({ id: "not-an-id", title: "x" }, config),
		).rejects.toThrow(ZodError);
		await expect(
			executeCreateCanvas(
				{
					title: "x",
					nodes: [{ id: "a", nodeId: "zz", title: "a", description: "b" }],
				},
				config,
			),
		).rejects.toThrow(ZodError);
		expect(fetch).not.toHaveBeenCalled();
	});

	it("requires title and description for new nodes but not reference nodes", async () => {
		vi.stubGlobal("fetch", vi.fn());
		await expect(
			executeCreateCanvas({ title: "x", nodes: [{ id: "a" }] }, config),
		).rejects.toThrow(/title is required/);
	});
});

describe("provenance", () => {
	it("mergeTags appends and dedupes; applyHeader prepends with a blank line", () => {
		expect(mergeTags(["a", "b"], ["b", "c", " c ", ""])).toEqual([
			"a",
			"b",
			"c",
		]);
		expect(mergeTags(undefined, ["x"])).toEqual(["x"]);
		expect(mergeTags(undefined, undefined)).toBeUndefined();
		expect(applyHeader("body", "Header")).toBe("Header\n\nbody");
		expect(applyHeader("", "Header")).toBe("Header");
		expect(applyHeader("body", undefined)).toBe("body");
	});

	it("create_ryzome_document merges tags and prepends the header to Text content", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(response({ documents: [documentView({})] }));
		vi.stubGlobal("fetch", fetch);

		await executeCreateDocument(
			{
				title: "Doc",
				tags: ["draft", "agent"],
				content: { _type: "Text", _content: { text: "Body" } },
				provenance: {
					tags: ["agent", "run-42"],
					header: "Generated by run 42",
				},
			},
			config,
		);

		const { body } = await bodyOf(fetch);
		expect(body.documents[0].tags).toEqual(["draft", "agent", "run-42"]);
		expect(body.documents[0].content).toEqual({
			_type: "Text",
			_content: { text: "Generated by run 42\n\nBody" },
		});
	});

	it("create_ryzome_document leaves non-text content untouched by the header", async () => {
		const fetch = vi.fn().mockResolvedValue(
			response({
				documents: [
					documentView({
						content: {
							_type: "Website",
							_content: { url: "https://example.com" },
						},
					}),
				],
			}),
		);
		vi.stubGlobal("fetch", fetch);

		await executeCreateDocument(
			{
				content: { _type: "Website", _content: { url: "https://example.com" } },
				provenance: { header: "ignored" },
			},
			config,
		);
		const { body } = await bodyOf(fetch);
		expect(body.documents[0].content).toEqual({
			_type: "Website",
			_content: { url: "https://example.com" },
		});
	});

	it("create_ryzome_canvas tags the canvas and prepends the header to NewDocument nodes only", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(
				response({
					documents: [
						documentView({
							content: { _type: "Canvas", _content: { nodes: [], edges: [] } },
						}),
					],
				}),
			)
			.mockResolvedValueOnce(new Response("{}", { status: 200 }));
		vi.stubGlobal("fetch", fetch);

		await executeCreateCanvas(
			{
				title: "Board",
				tags: ["board"],
				provenance: { tags: ["board", "agent"], header: "From agent" },
				nodes: [
					{ id: "a", title: "A", description: "First" },
					{ id: "b", documentId: existingDoc },
				],
			},
			config,
		);

		const create = await bodyOf(fetch, 0);
		expect(create.body.documents[0].tags).toEqual(["board", "agent"]);

		const patch = await bodyOf(fetch, 1);
		const nodes = (
			patch.body.operations as Array<Record<string, unknown>>
		).filter((o) => o._type === "createNode");
		expect(nodes[0].data).toMatchObject({
			_type: "NewDocument",
			_content: {
				content: { _type: "Text", _content: { text: "From agent\n\nFirst" } },
			},
		});
		expect(nodes[1].data).toEqual({
			_type: "ExistingDocument",
			_content: { document_id: existingDoc },
		});
	});

	it("create_ryzome_plan and create_ryzome_research forward provenance", async () => {
		const fetch = vi.fn(async (request: Request) =>
			request.method === "POST"
				? response({
						documents: [
							documentView({
								content: {
									_type: "Canvas",
									_content: { nodes: [], edges: [] },
								},
							}),
						],
					})
				: new Response(null, { status: 200 }),
		);
		vi.stubGlobal("fetch", fetch);

		await executePlanCanvas(
			{
				title: "Plan",
				steps: [{ title: "S1", description: "Do it" }],
				provenance: { tags: ["plan"], header: "Plan header" },
			},
			config,
		);
		expect((await bodyOf(fetch, 0)).body.documents[0].tags).toEqual(["plan"]);
		expect((await bodyOf(fetch, 1)).body.operations).toMatchObject([
			{
				_type: "createNode",
				data: {
					_type: "NewDocument",
					_content: {
						content: {
							_type: "Text",
							_content: { text: "Plan header\n\nDo it" },
						},
					},
				},
			},
		]);

		await executeResearchCanvas(
			{
				title: "Research",
				topic: "Topic",
				findings: [{ id: "f", title: "F", description: "Finding" }],
				provenance: { tags: ["research"] },
			},
			config,
		);
		expect((await bodyOf(fetch, 2)).body.documents[0].tags).toEqual([
			"research",
		]);
	});

	it("create_ryzome_bundle merges provenance tags", async () => {
		const fetch = vi.fn().mockResolvedValue(
			response({
				documents: [
					documentView({
						content: { _type: "Bundle", _content: { documentsMetadata: [] } },
					}),
				],
			}),
		);
		vi.stubGlobal("fetch", fetch);

		await executeCreateBundle(
			{ title: "Pack", tags: ["a"], provenance: { tags: ["a", "b"] } },
			config,
		);
		const { body } = await bodyOf(fetch);
		expect(body.documents[0].tags).toEqual(["a", "b"]);
	});
});
