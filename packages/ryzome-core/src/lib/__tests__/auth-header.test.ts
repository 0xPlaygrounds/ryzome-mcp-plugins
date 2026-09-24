import { afterEach, describe, expect, it, vi } from "vitest";
import { RyzomeClient } from "../ryzome-client.js";

const documentResponse = () =>
	new Response(
		JSON.stringify({
			_id: { $oid: "0123456789abcdef01234567" },
			title: "Doc",
			content: { _type: "Text", _content: { text: "hi" } },
			generated: false,
			inLibrary: true,
			pinned: false,
			ownerId: "owner",
			tags: [],
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		}),
		{ status: 200, headers: { "Content-Type": "application/json" } },
	);

describe("RyzomeClient authentication headers", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it.each([
		undefined,
		"eyJ.bearer.token",
	])("sends only x-api-key when a key is present (accessToken: %s)", async (accessToken) => {
		const fetchMock = vi.fn().mockResolvedValue(documentResponse());
		vi.stubGlobal("fetch", fetchMock);

		const client = new RyzomeClient({
			apiKey: "rz_key",
			accessToken,
			apiUrl: "https://api.example.com",
			appUrl: "https://app.example.com",
		});
		await client.getDocument("0123456789abcdef01234567");

		const request = fetchMock.mock.calls[0][0] as Request;
		expect(request.headers.get("x-api-key")).toBe("rz_key");
		expect(request.headers.get("authorization")).toBeNull();
	});

	it.each([
		undefined,
		"bearer",
	] as const)("sends only Authorization when a token is present (authMode: %s)", async (authMode) => {
		const fetchMock = vi.fn().mockResolvedValue(documentResponse());
		vi.stubGlobal("fetch", fetchMock);

		const client = new RyzomeClient({
			accessToken: "eyJ.bearer.token",
			authMode,
			apiUrl: "https://api.example.com",
			appUrl: "https://app.example.com",
		});
		await client.getDocument("0123456789abcdef01234567");

		const request = fetchMock.mock.calls[0][0] as Request;
		expect(request.headers.get("authorization")).toBe(
			"Bearer eyJ.bearer.token",
		);
		expect(request.headers.get("x-api-key")).toBeNull();
	});

	it("rejects a bearer client without an access token", () => {
		expect(
			() =>
				new RyzomeClient({
					authMode: "bearer",
					apiUrl: "https://api.example.com",
					appUrl: "https://app.example.com",
				}),
		).toThrow(/accessToken/);
	});
});
