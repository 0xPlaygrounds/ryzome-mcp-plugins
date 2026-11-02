import { afterEach, expect, it, vi } from "vitest";
import { RyzomeClient } from "../../lib/ryzome-client.js";
import { executeUploadImage } from "../upload-image.js";

const canvasId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const config = {
	apiKey: "test-only",
	apiUrl: "https://api.example.test",
	appUrl: "https://app.example.test",
};
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it("does not replay an image node creation after a committed PATCH loses its response", async () => {
	vi.spyOn(RyzomeClient.prototype, "requestUploadUrl").mockResolvedValue({
		url: "https://storage.example.test",
		fields: {},
	});
	const upload = vi
		.spyOn(RyzomeClient.prototype, "uploadFile")
		.mockResolvedValue(undefined);
	let commits = 0;
	vi.stubGlobal(
		"fetch",
		vi.fn(async (input: Request | string) => {
			if (typeof input === "string")
				return new Response("image", {
					headers: { "content-type": "image/png" },
				});
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
	expect(upload).toHaveBeenCalledOnce();
});
