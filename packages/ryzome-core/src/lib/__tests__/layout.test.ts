import { describe, it, expect } from "vitest";
import {
	BASE_NODE_HEIGHT,
	computeLegacyLayoutRects,
	estimateNodeHeight,
	NODE_WIDTH,
} from "../layout.js";

describe("estimateNodeHeight", () => {
	it("returns at least BASE_NODE_HEIGHT for short descriptions", () => {
		expect(estimateNodeHeight("Hi")).toBeGreaterThanOrEqual(BASE_NODE_HEIGHT);
		expect(estimateNodeHeight("")).toBeGreaterThanOrEqual(BASE_NODE_HEIGHT);
	});

	it("returns exactly BASE_NODE_HEIGHT for empty text", () => {
		expect(estimateNodeHeight("")).toBe(BASE_NODE_HEIGHT);
	});

	it("scales height with description length", () => {
		const short = estimateNodeHeight("Hello");
		const long = estimateNodeHeight("A".repeat(500));

		expect(long).toBeGreaterThan(short);
	});

	it("always returns a positive number", () => {
		expect(estimateNodeHeight("test")).toBeGreaterThan(0);
		expect(estimateNodeHeight("A".repeat(10000))).toBeGreaterThan(0);
	});
});

describe("computeLegacyLayoutRects (RYZOME_LAYOUT_ENGINE=legacy fallback)", () => {
	it("assigns a rect per input step", () => {
		const { nodeRects } = computeLegacyLayoutRects(
			[
				{ id: "a", description: "a" },
				{ id: "b", description: "b", dependsOn: ["a"] },
			],
			undefined,
		);

		expect(nodeRects.size).toBe(2);
		expect(nodeRects.get("a")?.width).toBe(NODE_WIDTH);
		expect(nodeRects.get("b")?.y).toBeGreaterThan(
			nodeRects.get("a")?.y ?? 0,
		);
	});

	it("wraps a group rect around its members", () => {
		const { groupRects, nodeRects } = computeLegacyLayoutRects(
			[
				{ id: "a", description: "a", group: "g1" },
				{ id: "b", description: "b", group: "g1" },
			],
			[{ id: "g1" }],
		);

		expect(groupRects.size).toBe(1);
		const rect = groupRects.get("g1");
		const nodeA = nodeRects.get("a");
		const nodeB = nodeRects.get("b");
		if (!rect || !nodeA || !nodeB) throw new Error("missing rect");

		expect(rect.x).toBeLessThanOrEqual(Math.min(nodeA.x, nodeB.x));
		expect(rect.y).toBeLessThanOrEqual(Math.min(nodeA.y, nodeB.y));
	});

	it("omits empty groups", () => {
		const { groupRects } = computeLegacyLayoutRects(
			[{ id: "a", description: "a" }],
			[{ id: "empty" }],
		);
		expect(groupRects.has("empty")).toBe(false);
	});
});
