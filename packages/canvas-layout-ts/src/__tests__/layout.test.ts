import { describe, expect, it } from "vitest";
import { computeCanvasLayout } from "../layout.js";
import type { LayoutRect } from "../types.js";

function rectsOverlap(a: LayoutRect, b: LayoutRect, tolerance = 0): boolean {
	return (
		a.x < b.x + b.width - tolerance &&
		a.x + a.width > b.x + tolerance &&
		a.y < b.y + b.height - tolerance &&
		a.y + a.height > b.y + tolerance
	);
}

function rectContains(
	outer: LayoutRect,
	inner: LayoutRect,
	tolerance = 0,
): boolean {
	return (
		inner.x >= outer.x - tolerance &&
		inner.y >= outer.y - tolerance &&
		inner.x + inner.width <= outer.x + outer.width + tolerance &&
		inner.y + inner.height <= outer.y + outer.height + tolerance
	);
}

describe("computeCanvasLayout", () => {
	it("returns an empty result for no nodes", async () => {
		const result = await computeCanvasLayout({ nodes: [] });
		expect(result.nodes).toEqual({});
		expect(result.groups).toEqual({});
	});

	it("places a single node at a finite position with default dimensions", async () => {
		const result = await computeCanvasLayout({ nodes: [{ id: "a" }] });
		expect(result.nodes.a).toBeDefined();
		expect(Number.isFinite(result.nodes.a.x)).toBe(true);
		expect(Number.isFinite(result.nodes.a.y)).toBe(true);
		expect(result.nodes.a.width).toBe(320);
		expect(result.nodes.a.height).toBe(180);
	});

	it("respects caller-supplied width/height", async () => {
		const result = await computeCanvasLayout({
			nodes: [{ id: "a", width: 400, height: 250 }],
		});
		expect(result.nodes.a.width).toBe(400);
		expect(result.nodes.a.height).toBe(250);
	});

	it("uses measureNode when provided, overriding node width/height", async () => {
		const result = await computeCanvasLayout(
			{ nodes: [{ id: "a", width: 100, height: 100 }] },
			{ measureNode: () => ({ width: 500, height: 300 }) },
		);
		expect(result.nodes.a.width).toBe(500);
		expect(result.nodes.a.height).toBe(300);
	});

	it("places a linear chain A->B->C in monotonic depth order", async () => {
		const result = await computeCanvasLayout({
			nodes: [
				{ id: "a" },
				{ id: "b", dependsOn: ["a"] },
				{ id: "c", dependsOn: ["b"] },
			],
		});
		const { a, b, c } = result.nodes;
		expect(a.y).toBeLessThan(b.y);
		expect(b.y).toBeLessThan(c.y);
	});

	it("places a diamond DAG with B and C on the same layer, between A and D", async () => {
		const result = await computeCanvasLayout({
			nodes: [
				{ id: "a" },
				{ id: "b", dependsOn: ["a"] },
				{ id: "c", dependsOn: ["a"] },
				{ id: "d", dependsOn: ["b", "c"] },
			],
		});
		const { a, b, c, d } = result.nodes;
		expect(a.y).toBeLessThan(b.y);
		expect(b.y).toBe(c.y);
		expect(b.y).toBeLessThan(d.y);
		expect(b.x).not.toBe(c.x);
	});

	it("never overlaps nodes in a wide flat graph", async () => {
		const nodes = Array.from({ length: 8 }, (_, i) => ({ id: `n${i}` }));
		const result = await computeCanvasLayout({ nodes });

		const rects = Object.values(result.nodes);
		for (let i = 0; i < rects.length; i++) {
			for (let j = i + 1; j < rects.length; j++) {
				expect(
					rectsOverlap(rects[i], rects[j]),
					`nodes ${i} and ${j} overlap: ${JSON.stringify(rects[i])} vs ${JSON.stringify(rects[j])}`,
				).toBe(false);
			}
		}
	});

	it("separates disconnected components horizontally without overlap", async () => {
		const result = await computeCanvasLayout({
			nodes: [
				{ id: "a" },
				{ id: "b", dependsOn: ["a"] },
				{ id: "x" },
				{ id: "y", dependsOn: ["x"] },
			],
		});

		const chain1 = [result.nodes.a, result.nodes.b];
		const chain2 = [result.nodes.x, result.nodes.y];
		for (const r1 of chain1) {
			for (const r2 of chain2) {
				expect(rectsOverlap(r1, r2)).toBe(false);
			}
		}
	});

	it("silently drops edges/dependsOn referencing unknown nodes", async () => {
		const result = await computeCanvasLayout({
			nodes: [{ id: "a", dependsOn: ["nonexistent"] }],
		});
		expect(result.nodes.a).toBeDefined();
	});

	it("handles cycles in dependsOn without throwing", async () => {
		const result = await computeCanvasLayout({
			nodes: [
				{ id: "a", dependsOn: ["b"] },
				{ id: "b", dependsOn: ["a"] },
			],
		});
		expect(result.nodes.a).toBeDefined();
		expect(result.nodes.b).toBeDefined();
		expect(rectsOverlap(result.nodes.a, result.nodes.b)).toBe(false);
	});

	it("clusters members of a group and nests them inside the group rect", async () => {
		const result = await computeCanvasLayout({
			nodes: [
				{ id: "a", group: "g1" },
				{ id: "b", group: "g1", dependsOn: ["a"] },
				{ id: "c" },
			],
			groups: [{ id: "g1", title: "Phase 1" }],
		});

		expect(result.groups.g1).toBeDefined();
		expect(rectContains(result.groups.g1, result.nodes.a)).toBe(true);
		expect(rectContains(result.groups.g1, result.nodes.b)).toBe(true);
		expect(rectContains(result.groups.g1, result.nodes.c)).toBe(false);
	});

	it("does not emit a group rect for an empty group", async () => {
		const result = await computeCanvasLayout({
			nodes: [{ id: "a" }],
			groups: [{ id: "g1" }],
		});
		expect(result.groups.g1).toBeUndefined();
		expect(result.nodes.a).toBeDefined();
	});

	it("does not produce overlapping group and non-group rects", async () => {
		const result = await computeCanvasLayout({
			nodes: [
				{ id: "a", group: "g1" },
				{ id: "b", group: "g1" },
				{ id: "c" },
				{ id: "d" },
			],
			groups: [{ id: "g1" }],
		});

		const otherNodes = [result.nodes.c, result.nodes.d];
		for (const node of otherNodes) {
			expect(
				rectsOverlap(result.groups.g1, node, 1),
				`${JSON.stringify(node)} overlaps group ${JSON.stringify(result.groups.g1)}`,
			).toBe(false);
		}
	});

	it("places nodes whose group id is not declared as root members", async () => {
		const result = await computeCanvasLayout({
			nodes: [
				{ id: "a", group: "undeclared" },
				{ id: "b" },
			],
		});
		expect(result.nodes.a).toBeDefined();
		expect(result.nodes.b).toBeDefined();
		expect(result.groups.undeclared).toBeUndefined();
	});

	it("accepts edges as input in addition to dependsOn", async () => {
		const result = await computeCanvasLayout({
			nodes: [{ id: "a" }, { id: "b" }],
			edges: [{ from: "a", to: "b" }],
		});
		expect(result.nodes.a.y).toBeLessThan(result.nodes.b.y);
	});

	it("lays out a group's members along its direction override", async () => {
		// Horizontal root direction, but g1 asks for DOWN internally.
		const result = await computeCanvasLayout(
			{
				nodes: [
					{ id: "a", group: "g1" },
					{ id: "b", group: "g1", dependsOn: ["a"] },
					{ id: "c", group: "g1", dependsOn: ["b"] },
				],
				groups: [{ id: "g1", direction: "DOWN" }],
			},
			{ direction: "RIGHT" },
		);

		const { a, b, c } = result.nodes;
		// DOWN inside g1 -> successor y strictly greater, x roughly equal.
		expect(a.y).toBeLessThan(b.y);
		expect(b.y).toBeLessThan(c.y);
		expect(Math.abs(a.x - b.x)).toBeLessThan(10);
		expect(Math.abs(b.x - c.x)).toBeLessThan(10);
	});

	it("handles a 50-node DAG with groups without overlaps", async () => {
		const nodes = Array.from({ length: 50 }, (_, i) => ({
			id: `n${i}`,
			group: i < 20 ? "g1" : i < 40 ? "g2" : undefined,
			dependsOn: i > 0 ? [`n${i - 1}`] : undefined,
		}));

		const result = await computeCanvasLayout({
			nodes,
			groups: [{ id: "g1" }, { id: "g2" }],
		});

		const rects = Object.values(result.nodes);
		expect(rects).toHaveLength(50);
		for (let i = 0; i < rects.length; i++) {
			for (let j = i + 1; j < rects.length; j++) {
				expect(rectsOverlap(rects[i], rects[j])).toBe(false);
			}
		}
		expect(result.groups.g1).toBeDefined();
		expect(result.groups.g2).toBeDefined();
	});
});
