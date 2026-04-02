import { afterEach, describe, expect, it, vi } from "vitest";
import { RyzomeClient } from "../../lib/ryzome-client.js";
import { executeResearchCanvas } from "../research-canvas.js";

const clientConfig = {
	apiKey: "secret-key",
	apiUrl: "https://api.ryzome.ai",
	appUrl: "https://ryzome.ai",
};

describe("executeResearchCanvas", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should create a topic root node and connected findings", async () => {
		vi.spyOn(RyzomeClient.prototype, "createCanvas").mockResolvedValue({
			canvas_id: { $oid: "0123456789abcdef01234567" },
		});
		const patchSpy = vi
			.spyOn(RyzomeClient.prototype, "patchCanvas")
			.mockResolvedValue(undefined);

		const result = await executeResearchCanvas(
			{
				title: "Research on X",
				topic: "Overview of X",
				findings: [
					{
						id: "f1",
						title: "Finding 1",
						description: "Detail 1",
						dependsOn: ["topic"],
					},
					{
						id: "f2",
						title: "Finding 2",
						description: "Detail 2",
						dependsOn: ["topic"],
					},
				],
			},
			clientConfig,
		);

		const ops = patchSpy.mock.calls[0][1].operations;
		// topic + 2 findings = 3 nodes
		expect(
			ops.filter((o: { _type: string }) => o._type === "createNode").length,
		).toBe(3);
		// 2 edges from topic to each finding
		expect(
			ops.filter((o: { _type: string }) => o._type === "createEdge").length,
		).toBe(2);
		expect(result.content[0].text).toContain("Nodes: 3 | Edges: 2");
	});

	it("should allow findings without dependsOn (disconnected nodes)", async () => {
		vi.spyOn(RyzomeClient.prototype, "createCanvas").mockResolvedValue({
			canvas_id: { $oid: "0123456789abcdef01234567" },
		});
		const patchSpy = vi
			.spyOn(RyzomeClient.prototype, "patchCanvas")
			.mockResolvedValue(undefined);

		const result = await executeResearchCanvas(
			{
				title: "Research",
				topic: "Topic",
				findings: [
					{ id: "f1", title: "F1", description: "Detail 1" },
					{ id: "f2", title: "F2", description: "Detail 2" },
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
		).toBe(0);
		expect(result.content[0].text).toContain("Nodes: 3 | Edges: 0");
	});

	it("should allow findings to chain off each other", async () => {
		vi.spyOn(RyzomeClient.prototype, "createCanvas").mockResolvedValue({
			canvas_id: { $oid: "0123456789abcdef01234567" },
		});
		const patchSpy = vi
			.spyOn(RyzomeClient.prototype, "patchCanvas")
			.mockResolvedValue(undefined);

		await executeResearchCanvas(
			{
				title: "Research",
				topic: "Root topic",
				findings: [
					{
						id: "f1",
						title: "Primary",
						description: "Main finding",
						dependsOn: ["topic"],
					},
					{
						id: "f2",
						title: "Secondary",
						description: "Follows from f1",
						dependsOn: ["f1"],
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
});
