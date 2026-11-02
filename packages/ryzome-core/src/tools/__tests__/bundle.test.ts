import { afterEach, describe, expect, it, vi } from "vitest";
import { executeCreateBundle } from "../create-bundle.js";
import { executeGetBundle } from "../get-bundle.js";
import { executeUpdateBundle } from "../update-bundle.js";
import { executeListDocuments } from "../list-documents.js";
import { executeGetDocument } from "../get-document.js";
import { RyzomeClient } from "../../lib/ryzome-client.js";

const id = "0123456789abcdef01234567";
const memberId = "1123456789abcdef01234567";
const config = {
	apiKey: "test-key",
	apiUrl: "https://api.example.com",
	appUrl: "https://app.example.com",
};
const bundle = {
	_id: { $oid: id },
	title: "Research",
	ownerId: "owner",
	tags: [],
	content: {
		_type: "Bundle",
		_content: {
			documentsMetadata: [
				{
					_type: "Authorized",
					_content: {
						_id: { $oid: memberId },
						title: "Notes",
						content: { _type: "Text" },
					},
				},
				{
					_type: "Unauthorized",
					_content: { $oid: "2123456789abcdef01234567" },
				},
				{ _type: "NotFound", _content: { $oid: "3123456789abcdef01234567" } },
				{
					_type: "Error",
					_content: {
						documentId: { $oid: "4123456789abcdef01234567" },
						message: "Unavailable",
					},
				},
			],
		},
	},
};
function response(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
function mockFetch(...responses: Response[]) {
	const mock = vi.fn();
	for (const value of responses) mock.mockResolvedValueOnce(value);
	vi.stubGlobal("fetch", mock);
	return mock;
}
afterEach(() => vi.unstubAllGlobals());
describe("bundle tools and API contracts", () => {
	it("creates ordered bundle membership through the document API with an API key", async () => {
		const fetch = mockFetch(response({ documents: [bundle] }));
		const result = await executeCreateBundle(
			{ title: "Research", document_ids: [memberId] },
			config,
		);
		const request = fetch.mock.calls[0][0] as Request;
		expect(request.method).toBe("POST");
		expect(request.url).toBe("https://api.example.com/v1/document");
		expect(request.headers.get("x-api-key")).toBe("test-key");
		expect(await request.json()).toEqual({
			documents: [
				{
					title: "Research",
					content: { _type: "Bundle", _content: { ids: [memberId] } },
				},
			],
		});
		expect(result.content[0].text).toContain(
			`View: https://app.example.com/workspace?document=${id}`,
		);
	});
	it("renders authorized and unavailable members in order", async () => {
		mockFetch(response(bundle));
		const result = await executeGetBundle({ bundle_id: id }, config);
		expect(result.content[0].text).toContain(`Notes (Text) — ${memberId}`);
		expect(result.content[0].text).toContain("Unauthorized");
		expect(result.content[0].text).toContain("NotFound");
		expect(result.content[0].text).toContain("Error: Unavailable");
	});
	it("renders bundles from the generic get document tool", async () => {
		mockFetch(response(bundle));
		const result = await executeGetDocument({ document_id: id }, config);
		expect(JSON.parse(result.content[0].text).content).toEqual(bundle.content);
	});
	it("sends exact add, remove, and reorder operation shapes", async () => {
		const fetch = mockFetch(response({ num_success: 3 }), response(bundle));
		const operations = [
			{ _type: "addDocument", id: memberId, position: 0 },
			{ _type: "removeDocument", id: memberId },
			{ _type: "reorderDocuments", ids: [memberId] },
		];
		await executeUpdateBundle({ bundle_id: id, operations }, config);
		const request = fetch.mock.calls[0][0] as Request;
		expect(request.method).toBe("PATCH");
		expect(request.url).toBe(`https://api.example.com/v1/bundle/${id}`);
		expect(await request.json()).toEqual({ operations });
		expect(fetch.mock.calls[1][0].method).toBe("GET");
	});
	it("lists Bundle metadata through the existing content filter", async () => {
		mockFetch(
			response({
				documents: [
					{
						...bundle,
						content: { _type: "Bundle" },
						pinned: false,
						inLibrary: true,
						createdAt: "2026-09-01",
						updatedAt: "2026-09-01",
					},
				],
			}),
		);
		const result = await executeListDocuments(
			{ content_types: ["Bundle"] },
			config,
		);
		expect(result.content[0].text).toContain("Research");
	});
	it("rejects non-bundle documents when requesting a bundle", async () => {
		mockFetch(
			response({
				...bundle,
				content: { _type: "Text", _content: { text: "hello" } },
			}),
		);
		await expect(executeGetBundle({ bundle_id: id }, config)).rejects.toThrow();
	});
	it("rejects empty updates before making a request", async () => {
		const fetch = mockFetch();
		await expect(
			executeUpdateBundle({ bundle_id: id, operations: [] }, config),
		).rejects.toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});
	it("retains forbidden responses for protected system bundle operations", async () => {
		const fetch = mockFetch(
			response("Cannot add or remove documents from the all_items bundle", 403),
		);
		await expect(
			executeUpdateBundle(
				{
					bundle_id: id,
					operations: [{ _type: "removeDocument", id: memberId }],
				},
				config,
			),
		).rejects.toMatchObject({
			status: 403,
			retryable: false,
			stage: "patchBundle",
		});
		expect(fetch).toHaveBeenCalledOnce();
	});
	it("classifies invalid patch JSON as a response error, not a retryable network failure", async () => {
		mockFetch(new Response("invalid json", { status: 200 }));
		await expect(
			new RyzomeClient(config).patchBundle(id, { operations: [] }),
		).rejects.toMatchObject({
			status: 200,
			retryable: false,
			stage: "patchBundle",
		});
	});
	it("does not claim success for a malformed patch response", async () => {
		mockFetch(response({ success: true }));
		await expect(
			new RyzomeClient(config).patchBundle(id, { operations: [] }),
		).rejects.toMatchObject({ status: 200, retryable: false });
	});
});
