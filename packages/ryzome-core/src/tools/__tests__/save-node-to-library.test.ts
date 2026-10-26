import { afterEach, describe, expect, it, vi } from "vitest";
import { executeSaveNodeToLibrary } from "../save-node-to-library.js";

const clientConfig = {
	apiKey: "secret-key",
	apiUrl: "https://api.ryzome.ai",
	appUrl: "https://ryzome.ai",
};

describe("executeSaveNodeToLibrary", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("promotes a node-backed document into the library", async () => {
		const canvas = {
			_id: { $oid: "canvas123" },
			title: "Research canvas",
			content: {
				_type: "Canvas",
				_content: {
					nodes: [
						{
							_id: { $oid: "node123" },
							color: "#ffffff",
							createdAt: "2026-01-01T00:00:00Z",
							updatedAt: "2026-01-01T00:00:00Z",
							height: 200,
							width: 320,
							x: 0,
							y: 0,
							data: {
								_type: "Authorized",
								_content: {
									_type: "Document",
									_id: { $oid: "doc123" },
									title: "Spec",
									description: null,
									content: {
										_type: "Text",
										_content: { text: "Hello world" },
									},
									generated: false,
									inLibrary: false,
									pinned: false,
									ownerId: "owner1",
									tags: [],
									createdAt: "2026-01-01T00:00:00Z",
									updatedAt: "2026-01-01T00:00:00Z",
								},
							},
						},
					],
					edges: [],
				},
			},
		};
		const fetch = vi.fn(async (request: Request) => {
			if (request.method === "GET") return Response.json(canvas);
			return Response.json({ updated: true });
		});
		vi.stubGlobal("fetch", fetch);

		const result = await executeSaveNodeToLibrary(
			{
				canvas_id: "canvas123",
				node_id: "node123",
			},
			clientConfig,
		);

		const writes = fetch.mock.calls.flatMap(([request]) =>
			request.method === "GET" ? [] : [request],
		);
		expect(writes).toHaveLength(1);
		expect(writes[0].method).toBe("PUT");
		expect(writes[0].url).toBe(
			"https://api.ryzome.ai/v1/document/doc123/metadata",
		);
		expect(await writes[0].json()).toEqual({ inLibrary: true });
		expect(result.content[0].text).toContain(
			"https://ryzome.ai/workspace?document=doc123",
		);
	});

	it("refuses to save a node whose document is unavailable", async () => {
		const canvas = {
			_id: { $oid: "canvas123" },
			title: "Research canvas",
			content: {
				_type: "Canvas",
				_content: {
					nodes: [
						{
							_id: { $oid: "node123" },
							color: "#ffffff",
							createdAt: "2026-01-01T00:00:00Z",
							updatedAt: "2026-01-01T00:00:00Z",
							height: 200,
							width: 320,
							x: 0,
							y: 0,
							data: { _type: "Unauthorized", _content: { $oid: "doc123" } },
						},
					],
					edges: [],
				},
			},
		};
		const fetch = vi.fn().mockImplementation(() => Response.json(canvas));
		vi.stubGlobal("fetch", fetch);

		await expect(
			executeSaveNodeToLibrary(
				{ canvas_id: "canvas123", node_id: "node123" },
				clientConfig,
			),
		).rejects.toThrow("unavailable (Unauthorized)");
		expect(fetch.mock.calls.map(([request]) => request.method)).toEqual([
			"GET",
		]);
	});

	it("refuses to save group nodes", async () => {
		const canvas = {
			_id: { $oid: "canvas123" },
			title: "Research canvas",
			content: {
				_type: "Canvas",
				_content: {
					nodes: [
						{
							_id: { $oid: "group1" },
							color: "#ffffff",
							createdAt: "2026-01-01T00:00:00Z",
							updatedAt: "2026-01-01T00:00:00Z",
							height: 200,
							width: 320,
							x: 0,
							y: 0,
							data: {
								_type: "Authorized",
								_content: { _type: "Group", title: "Phase" },
							},
						},
					],
					edges: [],
				},
			},
		};
		const fetch = vi.fn().mockImplementation(() => Response.json(canvas));
		vi.stubGlobal("fetch", fetch);

		await expect(
			executeSaveNodeToLibrary(
				{ canvas_id: "canvas123", node_id: "group1" },
				clientConfig,
			),
		).rejects.toThrow("Only document-backed nodes");
		expect(fetch.mock.calls.map(([request]) => request.method)).toEqual([
			"GET",
		]);
	});
});
