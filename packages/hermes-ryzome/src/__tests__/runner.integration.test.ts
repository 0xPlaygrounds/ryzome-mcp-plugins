import {
	createServer,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { runTool } from "../runner.js";

type StubRequest = {
	method: string;
	url: string;
	apiKey: string | null;
	body: unknown;
};

const CANVAS_ID = "507f1f77bcf86cd799439011";
const DOCUMENT_ID = "507f1f77bcf86cd799439012";
const LIBRARY_DOCUMENT_ID = "507f1f77bcf86cd799439013";
const NODE_ID = "507f1f77bcf86cd799439014";
const NOW = "2026-04-15T00:00:00.000Z";
const PNG_BYTES = Buffer.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
	0x49, 0x48, 0x44, 0x52,
]);

function buildTextDocument(overrides: Record<string, unknown> = {}) {
	return {
		_id: { $oid: DOCUMENT_ID },
		title: "Stored note",
		description: "A saved document",
		content: {
			_type: "Text",
			_content: {
				text: "hello world",
			},
		},
		generated: false,
		inLibrary: true,
		isFavorite: false,
		ownerId: "test-user",
		tags: ["reference"],
		createdAt: NOW,
		updatedAt: NOW,
		...overrides,
	};
}

function buildCanvasDocument() {
	return {
		_id: { $oid: CANVAS_ID },
		title: "Context graph",
		description: "A canvas document",
		content: {
			_type: "Canvas",
			_content: {
				nodes: [
					{
						_id: { $oid: NODE_ID },
						x: 0,
						y: 0,
						width: 320,
						height: 180,
						data: {
							_type: "Document",
							_id: { $oid: LIBRARY_DOCUMENT_ID },
							title: "Node-backed doc",
							description: "Canvas node",
							content: {
								_type: "Text",
								_content: { text: "node text" },
							},
							generated: false,
							inLibrary: false,
							isFavorite: false,
							ownerId: "test-user",
							tags: [],
							createdAt: NOW,
							updatedAt: NOW,
						},
					},
				],
				edges: [],
			},
		},
		generated: false,
		inLibrary: false,
		isFavorite: true,
		ownerId: "test-user",
		tags: [],
		createdAt: NOW,
		updatedAt: NOW,
	};
}

async function readJsonBody(req: IncomingMessage) {
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}

	const raw = Buffer.concat(chunks).toString("utf8");
	return raw ? (JSON.parse(raw) as unknown) : undefined;
}

async function readRawBody(req: IncomingMessage) {
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks).toString("utf8");
}

function writeJson(res: ServerResponse, statusCode: number, body: unknown) {
	res.statusCode = statusCode;
	res.setHeader("content-type", "application/json");
	res.end(JSON.stringify(body));
}

async function startStubServer() {
	const requests: StubRequest[] = [];
	let apiUrl = "";

	const server: Server = createServer(async (req, res) => {
		const method = req.method ?? "GET";
		const url = req.url ?? "/";
		const apiKey = req.headers["x-api-key"]
			? String(req.headers["x-api-key"])
			: null;

		if (method === "GET" && url === "/image/test.png") {
			res.statusCode = 200;
			res.setHeader("content-type", "image/png");
			res.end(PNG_BYTES);
			return;
		}

		if (method === "POST" && url === "/v1/document") {
			const body = await readJsonBody(req);
			requests.push({ method, url, apiKey, body });

			const first = Array.isArray((body as { documents?: unknown[] })?.documents)
				? (body as { documents: Array<Record<string, unknown>> }).documents[0]
				: undefined;
			const contentType =
				typeof first?.content === "object" &&
				first.content != null &&
				"_type" in first.content
					? (first.content as { _type?: unknown })._type
					: undefined;

			if (contentType === "Canvas") {
				writeJson(res, 200, { documents: [buildCanvasDocument()] });
				return;
			}

			writeJson(res, 200, {
				documents: [
					buildTextDocument({
						title:
							typeof first?.title === "string" ? first.title : "Stored note",
						description:
							typeof first?.description === "string"
								? first.description
								: "A saved document",
						tags: Array.isArray(first?.tags) ? first.tags : ["reference"],
						content:
							typeof first?.content === "object" && first.content != null
								? first.content
								: buildTextDocument().content,
					}),
				],
			});
			return;
		}

		if (method === "GET" && url === "/v1/document") {
			requests.push({ method, url, apiKey, body: undefined });
			writeJson(res, 200, [buildCanvasDocument(), buildTextDocument()]);
			return;
		}

		if (method === "GET" && url === `/v1/document/${CANVAS_ID}`) {
			requests.push({ method, url, apiKey, body: undefined });
			writeJson(res, 200, buildCanvasDocument());
			return;
		}

		if (method === "GET" && url === `/v1/document/${DOCUMENT_ID}`) {
			requests.push({ method, url, apiKey, body: undefined });
			writeJson(
				res,
				200,
				buildTextDocument({
					title: "Updated note",
					description: "Fresh draft",
					isFavorite: true,
					inLibrary: true,
				}),
			);
			return;
		}

		if (method === "PATCH" && url === `/v1/document/${DOCUMENT_ID}`) {
			const body = await readJsonBody(req);
			requests.push({ method, url, apiKey, body });
			writeJson(res, 200, {});
			return;
		}

		if (
			method === "PUT" &&
			(url === `/v1/document/${DOCUMENT_ID}/metadata` ||
				url === `/v1/document/${LIBRARY_DOCUMENT_ID}/metadata`)
		) {
			const body = await readJsonBody(req);
			requests.push({ method, url, apiKey, body });
			writeJson(res, 200, { updated: true });
			return;
		}

		if (method === "PATCH" && url === `/v1/canvas/${CANVAS_ID}`) {
			const body = await readJsonBody(req);
			requests.push({ method, url, apiKey, body });
			writeJson(res, 200, {});
			return;
		}

		if (method === "POST" && url === "/v1/files") {
			const body = await readJsonBody(req);
			requests.push({ method, url, apiKey, body });
			writeJson(res, 200, {
				url: `${apiUrl}/upload`,
				fields: {
					key: "upload-key",
					policy: "upload-policy",
				},
			});
			return;
		}

		if (method === "POST" && url === "/upload") {
			const body = await readRawBody(req);
			requests.push({ method, url, apiKey, body });
			res.statusCode = 204;
			res.end();
			return;
		}

		writeJson(res, 404, { error: `${method} ${url} not implemented in stub` });
	});

	await new Promise<void>((resolve) => {
		server.listen(0, "127.0.0.1", () => resolve());
	});

	const address = server.address();
	if (!address || typeof address === "string") {
		throw new Error("Failed to resolve stub server address");
	}

	apiUrl = `http://127.0.0.1:${address.port}`;

	return {
		apiUrl,
		appUrl: "https://ryzome.example.test",
		requests,
		stop: async () =>
			await new Promise<void>((resolve, reject) => {
				server.close((error) => {
					if (error) {
						reject(error);
						return;
					}
					resolve();
				});
			}),
	};
}

let activeStub: Awaited<ReturnType<typeof startStubServer>> | null = null;

afterEach(async () => {
	if (activeStub) {
		await activeStub.stop();
		activeStub = null;
	}
});

describe("Hermes runner integration", () => {
	it("returns a configuration error when apiKey is missing", async () => {
		const result = await runTool({
			toolName: "create_ryzome_canvas",
			params: {
				title: "Plan",
				nodes: [{ id: "a", title: "A", description: "First" }],
			},
			config: {},
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.message).toContain("hermes ryzome setup");
		}
	});

	it("creates a canvas through the shared toolRegistry implementation", async () => {
		activeStub = await startStubServer();

		const result = await runTool({
			toolName: "create_ryzome_canvas",
			params: {
				title: "Plan",
				nodes: [
					{ id: "discover", title: "Discover", description: "Inspect context" },
					{ id: "ship", title: "Ship", description: "Deliver output" },
				],
				edges: [{ from: "discover", to: "ship" }],
			},
			config: {
				apiKey: "stub-api-key",
				apiUrl: activeStub.apiUrl,
				appUrl: activeStub.appUrl,
			},
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.content[0]?.text).toContain(
				`${activeStub.appUrl}/workspace?canvas=${CANVAS_ID}`,
			);
			expect(result.content[0]?.text).toContain("Nodes: 2 | Edges: 1");
		}

		const createRequest = activeStub.requests.find(
			(request) => request.method === "POST" && request.url === "/v1/document",
		);
		const patchRequest = activeStub.requests.find(
			(request) =>
				request.method === "PATCH" && request.url === `/v1/canvas/${CANVAS_ID}`,
		);
		expect(createRequest?.apiKey).toBe("stub-api-key");
		expect(
			Array.isArray((patchRequest?.body as { operations?: unknown[] })?.operations),
		).toBe(true);
		expect(
			(patchRequest?.body as { operations: Array<{ _type: string }> }).operations.some(
				(operation) => operation._type === "createEdge",
			),
		).toBe(true);
	});

	it("lists documents through the shared toolRegistry implementation", async () => {
		activeStub = await startStubServer();

		const result = await runTool({
			toolName: "list_ryzome_documents",
			params: { in_library_only: false },
			config: {
				apiKey: "stub-api-key",
				apiUrl: activeStub.apiUrl,
				appUrl: activeStub.appUrl,
			},
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
				count: number;
				documents: Array<{ url: string }>;
			};
			expect(payload.count).toBe(2);
			expect(payload.documents[0]?.url).toContain(activeStub.appUrl);
		}
	});

	it("updates a document and returns the refreshed document view", async () => {
		activeStub = await startStubServer();

		const result = await runTool({
			toolName: "update_ryzome_document",
			params: {
				document_id: DOCUMENT_ID,
				title: "Updated note",
				description: "Fresh draft",
				favorite: true,
				in_library: true,
			},
			config: {
				apiKey: "stub-api-key",
				apiUrl: activeStub.apiUrl,
				appUrl: activeStub.appUrl,
			},
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.content[0]?.text).toContain("Document updated: **Updated note**");
		}

		const patchRequest = activeStub.requests.find(
			(request) =>
				request.method === "PATCH" &&
				request.url === `/v1/document/${DOCUMENT_ID}`,
		);
		const metadataRequest = activeStub.requests.find(
			(request) =>
				request.method === "PUT" &&
				request.url === `/v1/document/${DOCUMENT_ID}/metadata`,
		);

		expect(
			(patchRequest?.body as { operations?: unknown[] })?.operations,
		).toMatchObject([
			{ _type: "setTitle", title: "Updated note" },
			{ _type: "setFavoriteState", isFavorite: true },
		]);
		expect(metadataRequest?.body).toMatchObject({
			description: "Fresh draft",
			inLibrary: true,
		});
	});

	it("promotes a canvas node document into the library", async () => {
		activeStub = await startStubServer();

		const result = await runTool({
			toolName: "save_ryzome_node_to_library",
			params: {
				canvas_id: CANVAS_ID,
				node_id: NODE_ID,
			},
			config: {
				apiKey: "stub-api-key",
				apiUrl: activeStub.apiUrl,
				appUrl: activeStub.appUrl,
			},
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.content[0]?.text).toContain("Saved node document to library");
		}

		const metadataRequest = activeStub.requests.find(
			(request) =>
				request.method === "PUT" &&
				request.url === `/v1/document/${LIBRARY_DOCUMENT_ID}/metadata`,
		);
		expect(metadataRequest?.body).toMatchObject({ inLibrary: true });
	});

	it("uploads an image and patches the target canvas", async () => {
		activeStub = await startStubServer();

		const result = await runTool({
			toolName: "upload_ryzome_image",
			params: {
				canvas_id: CANVAS_ID,
				image_url: `${activeStub.apiUrl}/image/test.png`,
				title: "Diagram",
				color: "#4ECDC4",
			},
			config: {
				apiKey: "stub-api-key",
				apiUrl: activeStub.apiUrl,
				appUrl: activeStub.appUrl,
			},
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.content[0]?.text).toContain("Image uploaded to canvas");
		}

		const uploadUrlRequest = activeStub.requests.find(
			(request) => request.method === "POST" && request.url === "/v1/files",
		);
		const uploadRequest = activeStub.requests.find(
			(request) => request.method === "POST" && request.url === "/upload",
		);
		const patchRequest = activeStub.requests.find(
			(request) =>
				request.method === "PATCH" && request.url === `/v1/canvas/${CANVAS_ID}`,
		);

		expect(uploadUrlRequest?.body).toMatchObject({
			s3_key: expect.stringMatching(/^[a-f0-9]{64}$/),
		});
		expect(typeof uploadRequest?.body).toBe("string");
		expect(
			(patchRequest?.body as { operations?: Array<{ _type: string }> })?.operations?.some(
				(operation) => operation._type === "createNode",
			),
		).toBe(true);
	});
});
