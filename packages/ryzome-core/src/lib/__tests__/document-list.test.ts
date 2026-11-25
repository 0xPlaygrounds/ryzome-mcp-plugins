import { afterEach, describe, expect, it, vi } from "vitest";
import { RyzomeClient } from "../ryzome-client.js";
import { retryStage } from "../retry.js";
import { executeListDocuments } from "../../tools/list-documents.js";

const config = {
	apiKey: "test",
	apiUrl: "https://api.example.com",
	appUrl: "https://example.com",
};
const metadata = {
	_id: { $oid: "doc123" },
	title: "Canvas",
	description: null,
	content: { _type: "Canvas" },
	pinned: true,
	inLibrary: true,
	tags: ["research & notes"],
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};
function mockResponse(body: unknown, status = 200) {
	const fetchMock = vi.fn().mockImplementation(
		async () =>
			new Response(JSON.stringify(body), {
				status,
				headers: { "Content-Type": "application/json" },
			}),
	);
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}
afterEach(() => {
	vi.unstubAllGlobals();
});

describe("document list API contract", () => {
	it("lists metadata-only canvases and sends the current query names", async () => {
		const fetchMock = mockResponse({
			documents: [metadata, { ...metadata, content: { _type: "Text" } }],
		});
		const client = new RyzomeClient(config);
		const result = await client.listCanvases({ pinned: true });
		expect(result.data).toHaveLength(1);
		expect(result.data[0]).toMatchObject({ name: "Canvas", pinned: true });
		const url = new URL(fetchMock.mock.calls[0][0].url);
		expect(url.searchParams.get("pinned")).toBe("true");
		expect(url.searchParams.has("isFavorite")).toBe(false);
	});
	it("filters document metadata by tag and sends false favorites", async () => {
		const fetchMock = mockResponse({
			documents: [
				metadata,
				{ ...metadata, tags: [], content: { _type: "Applet" } },
			],
		});
		const result = await executeListDocuments(
			{ tag: "research & notes", favorite: false },
			config,
		);
		expect(JSON.parse(result.content[0].text).documents[0]).toMatchObject({
			isFavorite: true,
			contentType: "Canvas",
		});
		const url = new URL(fetchMock.mock.calls[0][0].url);
		expect(JSON.parse(result.content[0].text).count).toBe(1);
		expect(url.searchParams.has("tags")).toBe(false);
		expect(url.searchParams.get("pinned")).toBe("false");
		expect(url.searchParams.has("tag")).toBe(false);
	});
	it("normalizes BSON timestamps in metadata summaries", async () => {
		mockResponse({
			documents: [
				{
					...metadata,
					createdAt: { $date: { $numberLong: "1767225600000" } },
					updatedAt: { $date: "2026-01-01T00:00:00Z" },
				},
			],
		});
		const result = await new RyzomeClient(config).listDocuments();
		expect(result.data[0]).toMatchObject({
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00Z",
		});
	});
	it("keeps listing when the backend sends a document type the plugin doesn't know yet", async () => {
		mockResponse({
			documents: [metadata, { ...metadata, content: { _type: "Spreadsheet" } }],
		});
		const result = await new RyzomeClient(config).listDocuments();
		expect(result.data).toHaveLength(2);
	});
	it("accepts an empty envelope", async () => {
		mockResponse({ documents: [] });
		expect(await new RyzomeClient(config).listDocuments()).toEqual({
			data: [],
		});
	});
	it.each([
		{},
		[],
		{ documents: null },
		{ documents: {} },
		{ documents: [null] },
		{ documents: [{ ...metadata, content: null }] },
	])("does not retry malformed successful responses: %j", async (body) => {
		const fetchMock = mockResponse(body);
		await expect(
			retryStage(() => new RyzomeClient(config).listDocuments()),
		).rejects.toMatchObject({
			status: 200,
			retryable: false,
			stage: "listDocuments",
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
	it("preserves HTTP status for invalid JSON", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("not JSON", { status: 200 })),
		);
		await expect(
			new RyzomeClient(config).listDocuments(),
		).rejects.toMatchObject({ status: 200, retryable: false });
	});
	it("preserves HTTP failures", async () => {
		mockResponse({ message: "unavailable" }, 503);
		await expect(
			new RyzomeClient(config).listDocuments(),
		).rejects.toMatchObject({ status: 503, retryable: true });
	});
	it("still classifies transport failures as retryable", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockRejectedValue(new TypeError("fetch failed")),
		);
		await expect(
			new RyzomeClient(config).listDocuments(),
		).rejects.toMatchObject({ status: 0, retryable: true });
	});
});
