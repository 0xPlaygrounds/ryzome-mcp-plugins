import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	DEMO_IDEAS,
	printDemoHints,
	printDemoMenu,
	printDemoSuggestion,
	printSkipMessage,
	promptDemoCanvas,
} from "../onboarding";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("printDemoMenu", () => {
	it("prints all demo idea labels with numbering", () => {
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});
		printDemoMenu();
		const output = spy.mock.calls.map((c) => c[0]).join("\n");
		for (let i = 0; i < DEMO_IDEAS.length; i++) {
			expect(output).toContain(`${i + 1}`);
			expect(output).toContain(DEMO_IDEAS[i].label);
		}
	});
});

describe("printDemoSuggestion", () => {
	it("prints the suggestion prompt and tool hint", () => {
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});
		const idea = DEMO_IDEAS[2]; // "Plan your current sprint or task"
		printDemoSuggestion(idea);
		const output = spy.mock.calls.map((c) => c[0]).join("\n");
		expect(output).toContain("Try this:");
		expect(output).toContain(idea.toolHint);
		// Check that at least part of the prompt text appears (may be wrapped)
		expect(output).toContain("plan canvas");
	});
});

describe("printDemoHints", () => {
	it("prints all demo prompts and tool hints", () => {
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});
		printDemoHints();
		const output = spy.mock.calls.map((c) => c[0]).join("\n");
		for (const idea of DEMO_IDEAS) {
			expect(output).toContain(idea.toolHint);
		}
		expect(output).toContain("Try creating your first canvas");
	});
});

describe("printSkipMessage", () => {
	it("prints the skip message", () => {
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});
		printSkipMessage();
		const output = spy.mock.calls.map((c) => c[0]).join("\n");
		expect(output).toContain("canvas anytime");
	});
});

describe("promptDemoCanvas", () => {
	const originalIsTTY = process.stdin.isTTY;

	beforeEach(() => {
		process.stdin.isTTY = true;
	});

	afterEach(() => {
		process.stdin.isTTY = originalIsTTY;
	});

	it("prints suggestion for a valid selection", async () => {
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});
		const ask = vi.fn().mockResolvedValue("3");
		await promptDemoCanvas(ask);
		const output = spy.mock.calls.map((c) => c[0]).join("\n");
		expect(output).toContain("Try this:");
		expect(output).toContain(DEMO_IDEAS[2].toolHint);
	});

	it("prints skip message for empty input", async () => {
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});
		const ask = vi.fn().mockResolvedValue("");
		await promptDemoCanvas(ask);
		const output = spy.mock.calls.map((c) => c[0]).join("\n");
		expect(output).toContain("canvas anytime");
		expect(output).not.toContain("Try this:");
	});

	it("prints skip message for '0'", async () => {
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});
		const ask = vi.fn().mockResolvedValue("0");
		await promptDemoCanvas(ask);
		const output = spy.mock.calls.map((c) => c[0]).join("\n");
		expect(output).toContain("canvas anytime");
		expect(output).not.toContain("Try this:");
	});

	it("falls through to skip for invalid input", async () => {
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});
		const ask = vi.fn().mockResolvedValue("banana");
		await promptDemoCanvas(ask);
		const output = spy.mock.calls.map((c) => c[0]).join("\n");
		expect(output).toContain("canvas anytime");
		expect(output).not.toContain("Try this:");
	});

	it("falls through to skip for out-of-range number", async () => {
		const spy = vi.spyOn(console, "log").mockImplementation(() => {});
		const ask = vi.fn().mockResolvedValue("9");
		await promptDemoCanvas(ask);
		const output = spy.mock.calls.map((c) => c[0]).join("\n");
		expect(output).toContain("canvas anytime");
		expect(output).not.toContain("Try this:");
	});
});
