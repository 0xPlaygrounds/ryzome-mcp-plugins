import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCanvasGraph, type StepInput } from "../graph-builder.js";

type Operations = Awaited<ReturnType<typeof buildCanvasGraph>>["operations"];

function createNodeOps(ops: Operations) {
	return ops.filter(
		(o): o is typeof o & { _type: "createNode" } => o._type === "createNode",
	);
}

const canvasId = "0123456789abcdef01234567";

afterEach(() => vi.unstubAllEnvs());

describe("buildCanvasGraph reference nodes and explicit layout", () => {
	it.each([
		{ width: 1000, height: undefined, description: "" },
		{ width: undefined, height: 900, description: "" },
		{ width: undefined, height: undefined, description: "x".repeat(10000) },
	])("spaces legacy nodes using their final dimensions (case %#)", async (dimensions) => {
		vi.stubEnv("RYZOME_LAYOUT_ENGINE", "legacy");
		const graph = await buildCanvasGraph(
			[
				{ id: "large", title: "Large", ...dimensions, group: "g" },
				{ id: "sibling", title: "Sibling", description: "", group: "g" },
				{
					id: "child",
					title: "Child",
					description: "",
					dependsOn: ["large"],
					group: "g",
				},
			],
			canvasId,
			[{ id: "g" }],
		);
		const [group, large, sibling, child] = createNodeOps(graph.operations);
		expect(sibling.x).toBeGreaterThanOrEqual(large.x + large.width + 80);
		expect(child.y).toBeGreaterThanOrEqual(
			Math.max(large.y + large.height, sibling.y + sibling.height) + 60,
		);
		for (const node of [large, sibling, child]) {
			expect(node.x).toBeGreaterThanOrEqual(group.x);
			expect(node.x + node.width).toBeLessThanOrEqual(group.x + group.width);
			expect(node.y + node.height).toBeLessThanOrEqual(group.y + group.height);
		}
	});

	it("honors explicit x/y/width/height while laying out the other nodes", async () => {
		const steps: StepInput[] = [
			{
				id: "pinned",
				title: "Pinned",
				description: "Fixed position",
				x: 1000,
				y: -500,
				width: 400,
				height: 250,
			},
			{
				id: "auto",
				title: "Auto",
				description: "Laid out",
				dependsOn: ["pinned"],
			},
		];
		const graph = await buildCanvasGraph(steps, canvasId);
		const [pinned, auto] = createNodeOps(graph.operations);

		expect(pinned).toMatchObject({ x: 1000, y: -500, width: 400, height: 250 });
		expect(auto.width).toBe(320);
		expect(auto.x !== 1000 || auto.y !== -500).toBe(true);
	});

	it("overrides only the provided fields and keeps the engine values for the rest", async () => {
		const steps: StepInput[] = [
			{ id: "a", title: "A", description: "First", x: 42 },
		];
		const graph = await buildCanvasGraph(steps, canvasId);
		const [node] = createNodeOps(graph.operations);
		expect(node.x).toBe(42);
		expect(node.width).toBe(320);
		expect(node.height).toBeGreaterThan(0);
	});

	it("recomputes a group frame from the final member rects after overrides", async () => {
		const steps: StepInput[] = [
			{
				id: "a",
				title: "A",
				description: "First",
				group: "g",
				x: 5000,
				y: 5000,
				width: 300,
				height: 200,
			},
			{ id: "b", title: "B", description: "Second", group: "g" },
		];
		const graph = await buildCanvasGraph(steps, canvasId, [
			{ id: "g", title: "Group" },
		]);
		const nodes = createNodeOps(graph.operations);
		const group = nodes.find((n) => n.data?._type === "Group");
		const members = nodes.filter((n) => n.data?._type !== "Group");
		expect(group).toBeDefined();
		if (!group) return;

		for (const member of members) {
			expect(member.x).toBeGreaterThanOrEqual(group.x);
			expect(member.y).toBeGreaterThanOrEqual(group.y);
			expect(member.x + member.width).toBeLessThanOrEqual(
				group.x + group.width,
			);
			expect(member.y + member.height).toBeLessThanOrEqual(
				group.y + group.height,
			);
		}
	});
});
