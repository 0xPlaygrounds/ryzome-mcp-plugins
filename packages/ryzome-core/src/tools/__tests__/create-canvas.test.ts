import { afterEach, describe, expect, it, vi } from "vitest";
import { RyzomeApiError, RyzomeClient } from "../../lib/ryzome-client.js";
import { executeCreateCanvas } from "../create-canvas.js";

const clientConfig = {
	apiKey: "secret-key",
	apiUrl: "https://api.ryzome.ai",
	appUrl: "https://ryzome.ai",
};

const nodes = [
	{
		id: "research",
		title: "Research",
		description: "Gather information",
	},
];

describe("executeCreateCanvas", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should create a canvas with nodes and no edges", async () => {
		const createCanvasSpy = vi
			.spyOn(RyzomeClient.prototype, "createCanvas")
			.mockResolvedValue({
				canvas_id: { $oid: "0123456789abcdef01234567" },
			});
		const patchCanvasSpy = vi
			.spyOn(RyzomeClient.prototype, "patchCanvas")
			.mockResolvedValue(undefined);

		const result = await executeCreateCanvas(
			{ title: "Plan", nodes },
			clientConfig,
		);

		expect(createCanvasSpy).toHaveBeenCalledTimes(1);
		expect(patchCanvasSpy).toHaveBeenCalledTimes(1);
		expect(result.content[0].text).toContain(
			"https://ryzome.ai/workspace?canvas=0123456789abcdef01234567",
		);
	});

	it("should retry patchCanvas without recreating the canvas", async () => {
		const createCanvasSpy = vi
			.spyOn(RyzomeClient.prototype, "createCanvas")
			.mockResolvedValue({
				canvas_id: { $oid: "0123456789abcdef01234567" },
			});
		const patchCanvasSpy = vi
			.spyOn(RyzomeClient.prototype, "patchCanvas")
			.mockRejectedValueOnce(
				new RyzomeApiError({
					stage: "patchCanvas",
					method: "PATCH",
					path: "/canvas/0123456789abcdef01234567",
					status: 503,
					body: "temporary outage",
					retryable: true,
					canvasId: "0123456789abcdef01234567",
				}),
			)
			.mockResolvedValueOnce(undefined);

		const result = await executeCreateCanvas(
			{ title: "Plan", nodes },
			clientConfig,
		);

		expect(createCanvasSpy).toHaveBeenCalledTimes(1);
		expect(patchCanvasSpy).toHaveBeenCalledTimes(2);
		expect(result.content[0].text).toContain(
			"https://ryzome.ai/workspace?canvas=0123456789abcdef01234567",
		);
	});

	it("should create a canvas with edges and report correct counts", async () => {
		vi.spyOn(RyzomeClient.prototype, "createCanvas").mockResolvedValue({
			canvas_id: { $oid: "0123456789abcdef01234567" },
		});
		vi.spyOn(RyzomeClient.prototype, "patchCanvas").mockResolvedValue(
			undefined,
		);

		const result = await executeCreateCanvas(
			{
				title: "Plan",
				nodes: [
					{ id: "a", title: "A", description: "First" },
					{ id: "b", title: "B", description: "Second" },
				],
				edges: [{ from: "a", to: "b" }],
			},
			clientConfig,
		);

		expect(result.content[0].text).toContain("Nodes: 2 | Edges: 1");
	});

	it("should throw non-retryable errors immediately", async () => {
		vi.spyOn(RyzomeClient.prototype, "createCanvas").mockResolvedValue({
			canvas_id: { $oid: "0123456789abcdef01234567" },
		});
		vi.spyOn(RyzomeClient.prototype, "patchCanvas").mockRejectedValue(
			new RyzomeApiError({
				stage: "patchCanvas",
				method: "PATCH",
				path: "/canvas/0123456789abcdef01234567",
				status: 400,
				body: "bad request",
				retryable: false,
				canvasId: "0123456789abcdef01234567",
			}),
		);

		await expect(
			executeCreateCanvas({ title: "Plan", nodes }, clientConfig),
		).rejects.toMatchObject({
			stage: "patchCanvas",
			status: 400,
			retryable: false,
		});
	});
});
