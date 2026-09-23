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
			"https://ryzome.ai/workspace?document=0123456789abcdef01234567",
		);
	});

	it("surfaces ambiguous population failure without replaying the patch", async () => {
		const create = vi
			.spyOn(RyzomeClient.prototype, "createCanvas")
			.mockResolvedValue({ canvas_id: { $oid: "0123456789abcdef01234567" } });
		const error = new RyzomeApiError({
			stage: "patchCanvas",
			method: "PATCH",
			path: "/canvas/0123456789abcdef01234567",
			status: 503,
			body: "response lost",
			retryable: true,
			canvasId: "0123456789abcdef01234567",
		});
		const patch = vi
			.spyOn(RyzomeClient.prototype, "patchCanvas")
			.mockRejectedValue(error);
		await expect(
			executeCreateCanvas({ title: "Plan", nodes }, clientConfig),
		).rejects.toBe(error);
		expect(create).toHaveBeenCalledTimes(1);
		expect(patch).toHaveBeenCalledTimes(1);
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

	it("should pass edge labels through to createEdge operations", async () => {
		vi.spyOn(RyzomeClient.prototype, "createCanvas").mockResolvedValue({
			canvas_id: { $oid: "0123456789abcdef01234567" },
		});
		const patchCanvasSpy = vi
			.spyOn(RyzomeClient.prototype, "patchCanvas")
			.mockResolvedValue(undefined);

		await executeCreateCanvas(
			{
				title: "Plan",
				nodes: [
					{ id: "a", title: "A", description: "First" },
					{ id: "b", title: "B", description: "Second" },
					{ id: "c", title: "C", description: "Third" },
				],
				edges: [
					{ from: "a", to: "b", label: "leads to" },
					{ from: "a", to: "c" },
				],
			},
			clientConfig,
		);

		const operations = patchCanvasSpy.mock.calls[0][1].operations;
		const edgeOps = operations.filter((op) => op._type === "createEdge");
		expect(edgeOps.map((op) => op.label)).toEqual(
			expect.arrayContaining(["leads to", ""]),
		);
		expect(edgeOps).toHaveLength(2);
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
