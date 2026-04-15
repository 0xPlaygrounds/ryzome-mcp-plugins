import { afterEach, describe, expect, it, vi } from "vitest";
import { RyzomeApiError, RyzomeClient } from "../ryzome-client.js";

describe("RyzomeClient", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	async function readJsonRequestBody(fetchMock: ReturnType<typeof vi.fn>) {
		const [request, init] = fetchMock.mock.calls[0] ?? [];
		if (request instanceof Request) {
			return JSON.parse(await request.text());
		}

		if (typeof init?.body !== "string") {
			throw new Error("Expected a JSON request body");
		}

		return JSON.parse(init.body);
	}

	it("should surface stage-aware HTTP failures from the generated canvas client", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response("duplicate key", {
				status: 500,
				statusText: "Internal Server Error",
				headers: { "Content-Type": "text/plain" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const client = new RyzomeClient({
			apiKey: "secret-key",
			apiUrl: "https://api.ryzome.ai",
			appUrl: "https://ryzome.ai",
		});

		await expect(
			client.createCanvas({ name: "Test Canvas" }),
		).rejects.toMatchObject({
			stage: "createCanvas",
			method: "POST",
			path: "/document",
			status: 500,
			body: "duplicate key",
			retryable: true,
		});

		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it("creates a canvas document through the document endpoint", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					documents: [
						{
							_id: { $oid: "canvas123" },
							title: "Test Canvas",
							description: "Draft board",
							content: {
								_type: "Canvas",
								_content: { nodes: [], edges: [] },
							},
							generated: false,
							inLibrary: true,
							isFavorite: false,
							ownerId: "owner1",
							tags: [],
							createdAt: "2026-01-01T00:00:00Z",
							updatedAt: "2026-01-01T00:00:00Z",
						},
					],
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
		vi.stubGlobal("fetch", fetchMock);

		const client = new RyzomeClient({
			apiKey: "secret-key",
			apiUrl: "https://api.ryzome.ai",
			appUrl: "https://ryzome.ai",
		});

		const result = await client.createCanvas({
			name: "Test Canvas",
			description: "Draft board",
		});

		expect(result.canvas_id.$oid).toBe("canvas123");
		expect(await readJsonRequestBody(fetchMock)).toMatchObject({
			documents: [
				{
					title: "Test Canvas",
					description: "Draft board",
					content: {
						_type: "Canvas",
						_content: {
							nodes: [],
							edges: [],
						},
					},
				},
			],
		});
	});

	it("rejects non-canvas documents returned from createCanvas", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					documents: [
						{
							_id: { $oid: "doc123" },
							title: "Not a canvas",
							description: "Wrong content type",
							content: {
								_type: "Text",
								_content: { text: "Hello world" },
							},
							generated: false,
							inLibrary: true,
							isFavorite: false,
							ownerId: "owner1",
							tags: [],
							createdAt: "2026-01-01T00:00:00Z",
							updatedAt: "2026-01-01T00:00:00Z",
						},
					],
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
		vi.stubGlobal("fetch", fetchMock);

		const client = new RyzomeClient({
			apiKey: "secret-key",
			apiUrl: "https://api.ryzome.ai",
			appUrl: "https://ryzome.ai",
		});

		await expect(
			client.createCanvas({ name: "Test Canvas" }),
		).rejects.toMatchObject({
			stage: "createCanvas",
			method: "POST",
			path: "/document",
			status: 200,
			body: "Canvas creation returned a Text document",
			retryable: false,
			documentId: "doc123",
		});
	});

	it("should include canvas context for post-create failures", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response("invalid node id", {
				status: 400,
				statusText: "Bad Request",
				headers: { "Content-Type": "text/plain" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const client = new RyzomeClient({
			apiKey: "secret-key",
			apiUrl: "https://api.ryzome.ai",
			appUrl: "https://ryzome.ai",
		});

		let thrown: unknown;
		try {
			await client.patchCanvas("0123456789abcdef01234567", { operations: [] });
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(RyzomeApiError);
		expect(thrown).toMatchObject({
			stage: "patchCanvas",
			method: "PATCH",
			path: "/canvas/0123456789abcdef01234567",
			status: 400,
			body: "invalid node id",
			retryable: false,
			canvasId: "0123456789abcdef01234567",
		});
	});

	it("creates a standalone document through the document endpoint", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					documents: [
						{
							_id: { $oid: "doc123" },
							title: "Specs",
							description: "Draft spec",
							content: {
								_type: "Text",
								_content: { text: "Hello world" },
							},
							generated: false,
							inLibrary: true,
							isFavorite: false,
							ownerId: "owner1",
							tags: ["draft"],
							createdAt: "2026-01-01T00:00:00Z",
							updatedAt: "2026-01-01T00:00:00Z",
						},
					],
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
		vi.stubGlobal("fetch", fetchMock);

		const client = new RyzomeClient({
			apiKey: "secret-key",
			apiUrl: "https://api.ryzome.ai",
			appUrl: "https://ryzome.ai",
		});

		const document = await client.createDocument({
			title: "Specs",
			description: "Draft spec",
		});

		expect(document._id.$oid).toBe("doc123");
		expect(document.content._type).toBe("Text");
	});

	it("filters documents client-side for library visibility and content type", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify([
					{
						_id: { $oid: "doc123" },
						title: "Specs",
						description: "Draft spec",
						content: {
							_type: "Text",
							_content: { text: "Hello world" },
						},
						generated: false,
						inLibrary: true,
						isFavorite: false,
						ownerId: "owner1",
						tags: [],
						createdAt: "2026-01-01T00:00:00Z",
						updatedAt: "2026-01-01T00:00:00Z",
					},
					{
						_id: { $oid: "doc456" },
						title: "Private note",
						description: null,
						content: {
							_type: "Website",
							_content: { url: "https://example.com" },
						},
						generated: false,
						inLibrary: false,
						isFavorite: false,
						ownerId: "owner1",
						tags: [],
						createdAt: "2026-01-01T00:00:00Z",
						updatedAt: "2026-01-01T00:00:00Z",
					},
				]),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			),
		);
		vi.stubGlobal("fetch", fetchMock);

		const client = new RyzomeClient({
			apiKey: "secret-key",
			apiUrl: "https://api.ryzome.ai",
			appUrl: "https://ryzome.ai",
		});

		const result = await client.listDocuments({
			inLibraryOnly: true,
			contentTypes: ["Text"],
		});

		expect(result.data).toHaveLength(1);
		expect(result.data[0]?._id.$oid).toBe("doc123");
	});

	it("surfaces stage-aware metadata update failures for documents", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response("forbidden", {
				status: 404,
				statusText: "Not Found",
				headers: { "Content-Type": "text/plain" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const client = new RyzomeClient({
			apiKey: "secret-key",
			apiUrl: "https://api.ryzome.ai",
			appUrl: "https://ryzome.ai",
		});

		await expect(
			client.updateDocumentMetadata("doc123", { inLibrary: true }),
		).rejects.toMatchObject({
			stage: "updateDocumentMetadata",
			method: "PUT",
			path: "/document/doc123/metadata",
			status: 404,
			body: "forbidden",
			retryable: false,
			documentId: "doc123",
		});
	});
});
