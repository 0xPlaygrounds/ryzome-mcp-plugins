import { afterEach, expect, it, vi } from "vitest";
import { executeUploadImage } from "../upload-image.js";

const canvasId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const config = {
	apiKey: "test-only",
	apiUrl: "https://api.example.test",
	appUrl: "https://app.example.test",
};
afterEach(() => {
	vi.unstubAllGlobals();
});

it("does not replay an image node creation after a committed PATCH loses its response", async () => {
	let commits = 0;
	let uploads = 0;
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: Request | string) => {
			const url = typeof input === "string" ? input : input.url;
			if (url === "https://images.example.test/a.png")
				return new Response("image", {
					headers: { "content-type": "image/png" },
				});
			if (url === "https://api.example.test/v1/files")
				return Response.json({
					url: "https://storage.example.test",
					fields: {},
				});
			if (url === "https://storage.example.test") {
				uploads++;
				return new Response(null, { status: 204 });
			}
			if (!(input instanceof Request))
				throw new Error(`Unexpected request: ${url}`);
			expect(input.method).toBe("PATCH");
			const body = await input.json();
			expect(body.operations[0]._type).toBe("createNode");
			commits++;
			if (commits === 1) throw new TypeError("Response lost after commit");
			return new Response(null, { status: 200 });
		}),
	);
	await expect(
		executeUploadImage(
			{ canvas_id: canvasId, image_url: "https://images.example.test/a.png" },
			config,
		),
	).rejects.toMatchObject({ stage: "patchCanvas", canvasId });
	expect(commits).toBe(1);
	expect(uploads).toBe(1);
});
