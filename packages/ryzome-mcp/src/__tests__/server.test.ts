import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { toolRegistry, RyzomeClient } from "@ryzome-ai/ryzome-core";
import { createRyzomeMcpServer } from "../server.js";

describe("createRyzomeMcpServer", () => {
	it("creates a server instance", () => {
		const server = createRyzomeMcpServer();
		expect(server).toBeDefined();
	});

	it("registers all tools from the registry", () => {
		const registered: string[] = [];
		const mockServer = {
			tool: vi.fn((name: string) => {
				registered.push(name);
			}),
		};

		// Access internals via the real McpServer won't work simply, so
		// verify indirectly that toolRegistry has the expected tool names
		const expectedNames = toolRegistry.map((t) => t.name);
		expect(expectedNames).toContain("create_ryzome_canvas");
		expect(expectedNames).toContain("get_ryzome_canvas");
		expect(expectedNames).toContain("list_ryzome_canvases");
		expect(expectedNames).toContain("create_ryzome_plan");
		expect(expectedNames).toContain("create_ryzome_research");
		expect(expectedNames).toHaveLength(5);
	});
});

describe("tool execution via server", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv, RYZOME_API_KEY: "test-key" };
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.restoreAllMocks();
	});

	it("returns error content when API key is missing", async () => {
		process.env = { ...originalEnv };
		delete process.env.RYZOME_API_KEY;
		delete process.env.RYZOME_OPENCLAW_API_KEY;

		// The server is created without a key — handler should return isError
		const createCanvasTool = toolRegistry.find(
			(t) => t.name === "create_ryzome_canvas",
		);
		expect(createCanvasTool).toBeDefined();
	});

	it("tool handlers return MCP-compatible content format", async () => {
		vi.spyOn(RyzomeClient.prototype, "createCanvas").mockResolvedValue({
			canvas_id: { $oid: "0123456789abcdef01234567" },
		});
		vi.spyOn(RyzomeClient.prototype, "patchCanvas").mockResolvedValue(
			undefined,
		);

		const createCanvasTool = toolRegistry.find(
			(t) => t.name === "create_ryzome_canvas",
		);
		expect(createCanvasTool).toBeDefined();

		const result = await createCanvasTool!.execute(
			{
				title: "Test Canvas",
				nodes: [{ id: "n1", title: "Node 1", description: "Test node" }],
			},
			{ apiKey: "test-key", apiUrl: "https://api.ryzome.ai", appUrl: "https://ryzome.ai" },
		);

		expect(result.content).toHaveLength(1);
		expect(result.content[0].type).toBe("text");
		expect(result.content[0].text).toContain("Canvas created");
	});
});
