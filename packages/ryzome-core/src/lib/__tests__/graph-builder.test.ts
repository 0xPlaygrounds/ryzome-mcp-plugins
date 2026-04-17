import { describe, it, expect } from "vitest";
import { buildCanvasGraph, type StepInput } from "../graph-builder.js";

function hexRegex24() {
	return /^[a-f0-9]{24}$/;
}

type Operations = Awaited<ReturnType<typeof buildCanvasGraph>>["operations"];

function createNodeOps(ops: Operations) {
	return ops.filter(
		(o): o is typeof o & { _type: "createNode" } => o._type === "createNode",
	);
}

function createEdgeOps(ops: Operations) {
	return ops.filter(
		(o): o is typeof o & { _type: "createEdge" } => o._type === "createEdge",
	);
}

describe("buildCanvasGraph", () => {
	const canvasId = "0123456789abcdef01234567";

	it("produces 1 createNode and 0 createEdge for a single step with no deps", async () => {
		const steps: StepInput[] = [
			{ id: "a", title: "Step A", description: "Do A" },
		];
		const graph = await buildCanvasGraph(steps, canvasId);

		const nodes = createNodeOps(graph.operations);
		const edges = createEdgeOps(graph.operations);

		expect(nodes).toHaveLength(1);
		expect(edges).toHaveLength(0);

		const node = nodes[0];
		expect(node.id).toMatch(hexRegex24());
		expect(node.data?._type).toBe("NewDocument");
		if (node.data?._type === "NewDocument") {
			expect(node.data._content.title).toBe("Step A");
			expect(node.data._content.content?._type).toBe("Text");
			if (node.data._content.content?._type === "Text") {
				expect(node.data._content.content._content.text).toBe("Do A");
			}
			expect(node.data._content.generated).toBe(true);
		}
		expect(node.width).toBe(320);
	});

	it("builds a linear chain A -> B -> C with edges pointing down the layers", async () => {
		const steps: StepInput[] = [
			{ id: "a", title: "A", description: "First" },
			{ id: "b", title: "B", description: "Second", dependsOn: ["a"] },
			{ id: "c", title: "C", description: "Third", dependsOn: ["b"] },
		];
		const graph = await buildCanvasGraph(steps, canvasId);

		const nodes = createNodeOps(graph.operations);
		const edges = createEdgeOps(graph.operations);

		expect(nodes).toHaveLength(3);
		expect(edges).toHaveLength(2);

		const nodeIds = nodes.map((n) => n.id);
		expect(new Set(nodeIds).size).toBe(3);

		const [nodeA, nodeB, nodeC] = nodes;
		expect(nodeA.y).toBeLessThan(nodeB.y);
		expect(nodeB.y).toBeLessThan(nodeC.y);

		const byId = new Map(nodes.map((n) => [n.id, n]));
		expect(edges[0].fromNodeId).toBe(nodeA.id);
		expect(edges[0].toNodeId).toBe(nodeB.id);
		expect(edges[0].fromSide).toBe("bottom");
		expect(edges[0].toSide).toBe("top");
		expect(edges[1].fromNodeId).toBe(nodeB.id);
		expect(edges[1].toNodeId).toBe(nodeC.id);
		expect(byId.size).toBe(3);
	});

	it("places diamond DAG siblings on the same layer below the root and above the merge", async () => {
		const steps: StepInput[] = [
			{ id: "a", title: "A", description: "Root" },
			{ id: "b", title: "B", description: "Left", dependsOn: ["a"] },
			{ id: "c", title: "C", description: "Right", dependsOn: ["a"] },
			{ id: "d", title: "D", description: "Merge", dependsOn: ["b", "c"] },
		];
		const graph = await buildCanvasGraph(steps, canvasId);

		const nodes = createNodeOps(graph.operations);
		const edges = createEdgeOps(graph.operations);

		expect(nodes).toHaveLength(4);
		expect(edges).toHaveLength(4);

		const [nodeA, nodeB, nodeC, nodeD] = nodes;
		expect(nodeB.y).toBe(nodeC.y);
		expect(nodeA.y).toBeLessThan(nodeB.y);
		expect(nodeB.y).toBeLessThan(nodeD.y);
		expect(nodeB.x).not.toBe(nodeC.x);
	});

	it("assigns fresh node and edge IDs across runs", async () => {
		const steps: StepInput[] = [{ id: "a", title: "A", description: "Test" }];
		const canvasA = await buildCanvasGraph(steps, "aaaaaaaaaaaaaaaaaaaaaaaa");
		const canvasB = await buildCanvasGraph(steps, "bbbbbbbbbbbbbbbbbbbbbbbb");

		const nodeA = createNodeOps(canvasA.operations)[0];
		const nodeB = createNodeOps(canvasB.operations)[0];

		expect(nodeA.id).not.toBe(nodeB.id);
		expect(nodeA.id).toMatch(hexRegex24());
		expect(nodeB.id).toMatch(hexRegex24());
	});

	it("generates unique ObjectId edge IDs", async () => {
		const steps: StepInput[] = [
			{ id: "a", title: "A", description: "Root" },
			{ id: "b", title: "B", description: "Child 1", dependsOn: ["a"] },
			{ id: "c", title: "C", description: "Child 2", dependsOn: ["a"] },
		];
		const graph = await buildCanvasGraph(steps, canvasId);

		const edges = createEdgeOps(graph.operations);
		expect(edges).toHaveLength(2);
		expect(edges[0].id).toMatch(hexRegex24());
		expect(edges[1].id).toMatch(hexRegex24());
		expect(edges[0].id).not.toBe(edges[1].id);
	});

	it("silently drops edges for orphan dependsOn references", async () => {
		const steps: StepInput[] = [
			{
				id: "a",
				title: "A",
				description: "Only step",
				dependsOn: ["nonexistent"],
			},
		];
		const graph = await buildCanvasGraph(steps, canvasId);

		const nodes = createNodeOps(graph.operations);
		const edges = createEdgeOps(graph.operations);

		expect(nodes).toHaveLength(1);
		expect(edges).toHaveLength(0);
	});

	it("does not overlap any two node rects", async () => {
		const steps: StepInput[] = [
			{ id: "a", title: "A", description: "Root" },
			{ id: "b", title: "B", description: "Child 1", dependsOn: ["a"] },
			{ id: "c", title: "C", description: "Child 2", dependsOn: ["a"] },
			{ id: "d", title: "D", description: "Grandchild", dependsOn: ["b"] },
		];
		const graph = await buildCanvasGraph(steps, canvasId);

		const nodes = createNodeOps(graph.operations);

		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				const a = nodes[i];
				const b = nodes[j];
				const overlaps =
					(a.x ?? 0) < (b.x ?? 0) + (b.width ?? 0) &&
					(a.x ?? 0) + (a.width ?? 0) > (b.x ?? 0) &&
					(a.y ?? 0) < (b.y ?? 0) + (b.height ?? 0) &&
					(a.y ?? 0) + (a.height ?? 0) > (b.y ?? 0);
				expect(overlaps, `${a.id} overlaps ${b.id}`).toBe(false);
			}
		}
	});

	it("wraps groups around their members, not around unrelated nodes", async () => {
		const steps: StepInput[] = [
			{ id: "a", title: "A", description: "Grouped root", group: "g1" },
			{
				id: "b",
				title: "B",
				description: "Grouped child",
				dependsOn: ["a"],
				group: "g1",
			},
			{ id: "c", title: "C", description: "Outside the group" },
		];
		const groups = [{ id: "g1", title: "Phase 1" }];
		const graph = await buildCanvasGraph(steps, canvasId, groups);

		const nodes = createNodeOps(graph.operations);

		const groupNodes = nodes.filter(
			(n) => n.data?._type === "Group",
		);
		expect(groupNodes).toHaveLength(1);
		const groupNode = groupNodes[0];

		const nodeById = new Map(nodes.map((n) => [n.id, n]));
		// Find A, B, C by title inside data._content
		const titleOf = (n: (typeof nodes)[number]) =>
			n.data?._type === "NewDocument" ? n.data._content.title : null;
		const nodeA = nodes.find((n) => titleOf(n) === "A");
		const nodeB = nodes.find((n) => titleOf(n) === "B");
		const nodeC = nodes.find((n) => titleOf(n) === "C");
		expect(nodeA && nodeB && nodeC).toBeTruthy();
		if (!nodeA || !nodeB || !nodeC || !nodeById.size) return;

		const contains = (
			outer: typeof groupNode,
			inner: (typeof nodes)[number],
		) =>
			(inner.x ?? 0) >= (outer.x ?? 0) &&
			(inner.y ?? 0) >= (outer.y ?? 0) &&
			(inner.x ?? 0) + (inner.width ?? 0) <=
				(outer.x ?? 0) + (outer.width ?? 0) &&
			(inner.y ?? 0) + (inner.height ?? 0) <=
				(outer.y ?? 0) + (outer.height ?? 0);

		expect(contains(groupNode, nodeA)).toBe(true);
		expect(contains(groupNode, nodeB)).toBe(true);
		expect(contains(groupNode, nodeC)).toBe(false);
	});

	it("smoke: 50-node plan canvas has no overlapping nodes", async () => {
		const steps: StepInput[] = Array.from({ length: 50 }, (_, i) => ({
			id: `s${i}`,
			title: `Step ${i}`,
			description: `Description for step ${i}`.padEnd(50, " "),
			dependsOn: i > 0 ? [`s${i - 1}`] : undefined,
		}));
		const graph = await buildCanvasGraph(steps, canvasId);

		const nodes = createNodeOps(graph.operations);
		expect(nodes).toHaveLength(50);

		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				const a = nodes[i];
				const b = nodes[j];
				const overlaps =
					(a.x ?? 0) < (b.x ?? 0) + (b.width ?? 0) &&
					(a.x ?? 0) + (a.width ?? 0) > (b.x ?? 0) &&
					(a.y ?? 0) < (b.y ?? 0) + (b.height ?? 0) &&
					(a.y ?? 0) + (a.height ?? 0) > (b.y ?? 0);
				expect(overlaps).toBe(false);
			}
		}
	});

	it("smoke: research canvas with multiple groups produces tight group rects", async () => {
		const steps: StepInput[] = [
			{ id: "g1-a", title: "G1 A", description: "Root A", group: "g1" },
			{ id: "g1-b", title: "G1 B", description: "Child A", dependsOn: ["g1-a"], group: "g1" },
			{ id: "g2-a", title: "G2 A", description: "Root B", group: "g2" },
			{ id: "g2-b", title: "G2 B", description: "Child B", dependsOn: ["g2-a"], group: "g2" },
			{ id: "bridge", title: "Bridge", description: "Joins", dependsOn: ["g1-b", "g2-b"] },
		];
		const groups = [
			{ id: "g1", title: "Phase 1" },
			{ id: "g2", title: "Phase 2" },
		];
		const graph = await buildCanvasGraph(steps, canvasId, groups);
		const nodes = createNodeOps(graph.operations);

		const groupRects = nodes.filter((n) => n.data?._type === "Group");
		expect(groupRects).toHaveLength(2);

		// Every group rect must contain its declared members.
		const titleOf = (n: (typeof nodes)[number]) =>
			n.data?._type === "NewDocument" ? n.data._content.title : null;
		const contains = (
			outer: (typeof nodes)[number],
			inner: (typeof nodes)[number],
		) =>
			(inner.x ?? 0) >= (outer.x ?? 0) &&
			(inner.y ?? 0) >= (outer.y ?? 0) &&
			(inner.x ?? 0) + (inner.width ?? 0) <=
				(outer.x ?? 0) + (outer.width ?? 0) &&
			(inner.y ?? 0) + (inner.height ?? 0) <=
				(outer.y ?? 0) + (outer.height ?? 0);

		const g1Rect = groupRects[0];
		const g2Rect = groupRects[1];
		const g1a = nodes.find((n) => titleOf(n) === "G1 A");
		const g1b = nodes.find((n) => titleOf(n) === "G1 B");
		const g2a = nodes.find((n) => titleOf(n) === "G2 A");
		const g2b = nodes.find((n) => titleOf(n) === "G2 B");
		expect(g1a && g1b && g2a && g2b).toBeTruthy();
		if (!g1a || !g1b || !g2a || !g2b) return;

		// One group contains g1 members, the other g2 members (order not guaranteed).
		const g1Members = contains(g1Rect, g1a) && contains(g1Rect, g1b);
		const g2MembersInG1 = contains(g1Rect, g2a) && contains(g1Rect, g2b);
		expect(g1Members || g2MembersInG1).toBe(true);

		const bridge = nodes.find((n) => titleOf(n) === "Bridge");
		expect(bridge).toBeTruthy();
		if (!bridge) return;
		expect(contains(g1Rect, bridge)).toBe(false);
		expect(contains(g2Rect, bridge)).toBe(false);
	});

	it("smoke: disconnected roots are laid out side-by-side without overlap", async () => {
		const steps: StepInput[] = [
			{ id: "a1", title: "A1", description: "Root A" },
			{ id: "a2", title: "A2", description: "Leaf A", dependsOn: ["a1"] },
			{ id: "b1", title: "B1", description: "Root B" },
			{ id: "b2", title: "B2", description: "Leaf B", dependsOn: ["b1"] },
		];
		const graph = await buildCanvasGraph(steps, canvasId);
		const nodes = createNodeOps(graph.operations);
		expect(nodes).toHaveLength(4);

		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				const a = nodes[i];
				const b = nodes[j];
				const overlaps =
					(a.x ?? 0) < (b.x ?? 0) + (b.width ?? 0) &&
					(a.x ?? 0) + (a.width ?? 0) > (b.x ?? 0) &&
					(a.y ?? 0) < (b.y ?? 0) + (b.height ?? 0) &&
					(a.y ?? 0) + (a.height ?? 0) > (b.y ?? 0);
				expect(overlaps).toBe(false);
			}
		}
	});

	it("smoke: canvas with a dependsOn cycle still produces layout without throwing", async () => {
		const steps: StepInput[] = [
			{ id: "a", title: "A", description: "node a", dependsOn: ["c"] },
			{ id: "b", title: "B", description: "node b", dependsOn: ["a"] },
			{ id: "c", title: "C", description: "node c", dependsOn: ["b"] },
		];
		const graph = await buildCanvasGraph(steps, canvasId);
		const nodes = createNodeOps(graph.operations);
		expect(nodes).toHaveLength(3);

		for (let i = 0; i < nodes.length; i++) {
			for (let j = i + 1; j < nodes.length; j++) {
				const a = nodes[i];
				const b = nodes[j];
				const overlaps =
					(a.x ?? 0) < (b.x ?? 0) + (b.width ?? 0) &&
					(a.x ?? 0) + (a.width ?? 0) > (b.x ?? 0) &&
					(a.y ?? 0) < (b.y ?? 0) + (b.height ?? 0) &&
					(a.y ?? 0) + (a.height ?? 0) > (b.y ?? 0);
				expect(overlaps).toBe(false);
			}
		}
	});

	it("produces deterministic layout for the same input", async () => {
		const steps: StepInput[] = [
			{ id: "a", title: "A", description: "Root" },
			{ id: "b", title: "B", description: "Child", dependsOn: ["a"] },
		];
		const g1 = await buildCanvasGraph(steps, canvasId);
		const g2 = await buildCanvasGraph(steps, canvasId);

		const nodes1 = createNodeOps(g1.operations);
		const nodes2 = createNodeOps(g2.operations);
		const edges1 = createEdgeOps(g1.operations);
		const edges2 = createEdgeOps(g2.operations);

		expect(nodes1.map((n) => n.id)).not.toEqual(nodes2.map((n) => n.id));
		expect(edges1.map((e) => e.id)).not.toEqual(edges2.map((e) => e.id));

		expect(
			nodes1.every((n) => typeof n.id === "string" && hexRegex24().test(n.id)),
		).toBe(true);
		expect(
			nodes2.every((n) => typeof n.id === "string" && hexRegex24().test(n.id)),
		).toBe(true);

		const titleOf = (n: (typeof nodes1)[number]) =>
			n.data?._type === "NewDocument" ? n.data._content.title : null;
		expect(
			nodes1.map((n) => ({ x: n.x, y: n.y, title: titleOf(n) })),
		).toEqual(
			nodes2.map((n) => ({ x: n.x, y: n.y, title: titleOf(n) })),
		);
	});
});
