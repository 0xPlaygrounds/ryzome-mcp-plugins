import { afterEach, describe, expect, it, vi } from "vitest";
import { RyzomeClient } from "../../lib/ryzome-client.js";
import { executePlanCanvas } from "../plan-canvas.js";

const clientConfig = {
	apiKey: "secret-key",
	apiUrl: "https://api.ryzome.ai",
	appUrl: "https://ryzome.ai",
};

describe("executePlanCanvas", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should auto-chain steps when no ids or dependsOn are specified", async () => {
		vi.spyOn(RyzomeClient.prototype, "createCanvas").mockResolvedValue({
			canvas_id: { $oid: "0123456789abcdef01234567" },
		});
		const patchSpy = vi
			.spyOn(RyzomeClient.prototype, "patchCanvas")
			.mockResolvedValue(undefined);

		const result = await executePlanCanvas(
			"tool-call-id",
			{
				title: "My Plan",
				steps: [
					{ title: "Step 1", description: "First step" },
					{ title: "Step 2", description: "Second step" },
					{ title: "Step 3", description: "Third step" },
				],
			},
			clientConfig,
		);

		const ops = patchSpy.mock.calls[0][1].operations;
		expect(
			ops.filter((o: { _type: string }) => o._type === "createNode").length,
		).toBe(3);
		expect(
			ops.filter((o: { _type: string }) => o._type === "createEdge").length,
		).toBe(2);
		expect(result.content[0].text).toContain("Nodes: 3 | Edges: 2");
	});

	it("should use custom ids and dependsOn for branching", async () => {
		vi.spyOn(RyzomeClient.prototype, "createCanvas").mockResolvedValue({
			canvas_id: { $oid: "0123456789abcdef01234567" },
		});
		const patchSpy = vi
			.spyOn(RyzomeClient.prototype, "patchCanvas")
			.mockResolvedValue(undefined);

		await executePlanCanvas(
			"tool-call-id",
			{
				title: "Branching Plan",
				steps: [
					{ id: "start", title: "Start", description: "Starting point" },
					{
						id: "branch-a",
						title: "Branch A",
						description: "Path A",
						dependsOn: ["start"],
					},
					{
						id: "branch-b",
						title: "Branch B",
						description: "Path B",
						dependsOn: ["start"],
					},
				],
			},
			clientConfig,
		);

		const ops = patchSpy.mock.calls[0][1].operations;
		expect(
			ops.filter((o: { _type: string }) => o._type === "createEdge").length,
		).toBe(2);
	});

	it("should handle a single step with no dependencies", async () => {
		vi.spyOn(RyzomeClient.prototype, "createCanvas").mockResolvedValue({
			canvas_id: { $oid: "0123456789abcdef01234567" },
		});
		const patchSpy = vi
			.spyOn(RyzomeClient.prototype, "patchCanvas")
			.mockResolvedValue(undefined);

		const result = await executePlanCanvas(
			"tool-call-id",
			{
				title: "Single Step",
				steps: [{ title: "Only step", description: "Just this" }],
			},
			clientConfig,
		);

		const ops = patchSpy.mock.calls[0][1].operations;
		expect(
			ops.filter((o: { _type: string }) => o._type === "createNode").length,
		).toBe(1);
		expect(
			ops.filter((o: { _type: string }) => o._type === "createEdge").length,
		).toBe(0);
		expect(result.content[0].text).toContain("Nodes: 1 | Edges: 0");
	});

	it("should default step ids to step-{index}", async () => {
		vi.spyOn(RyzomeClient.prototype, "createCanvas").mockResolvedValue({
			canvas_id: { $oid: "0123456789abcdef01234567" },
		});
		const patchSpy = vi
			.spyOn(RyzomeClient.prototype, "patchCanvas")
			.mockResolvedValue(undefined);

		await executePlanCanvas(
			"tool-call-id",
			{
				title: "Plan",
				steps: [
					{ title: "A", description: "desc a" },
					{ title: "B", description: "desc b" },
				],
			},
			clientConfig,
		);

		// Verify 1 edge was created (step-0 -> step-1 auto-chain)
		const ops = patchSpy.mock.calls[0][1].operations;
		expect(
			ops.filter((o: { _type: string }) => o._type === "createEdge").length,
		).toBe(1);
	});
});
