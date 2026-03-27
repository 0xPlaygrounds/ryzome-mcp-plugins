import { afterEach, describe, expect, it, vi } from "vitest";
import { RyzomeApiError, RyzomeClient } from "../ryzome-client.js";

describe("RyzomeClient", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

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
			path: "/canvas",
			status: 500,
			body: "duplicate key",
			retryable: true,
		});

		expect(fetchMock).toHaveBeenCalledOnce();
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
});
