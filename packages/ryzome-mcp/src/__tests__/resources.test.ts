import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { RyzomeClient } from "@ryzome-ai/ryzome-core";
import { createRyzomeMcpServer } from "../server.js";

const mockCanvases = [
	{
		_id: { $oid: "aaa111" },
		name: "Research Canvas",
		description: "AI research notes",
		isTemplate: false,
		pinned: true,
		updatedAt: "2026-03-28T12:00:00Z",
	},
	{
		_id: { $oid: "bbb222" },
		name: "Plan Canvas",
		description: null,
		isTemplate: false,
		pinned: false,
		updatedAt: "2026-03-27T08:00:00Z",
	},
];

const mockCanvasDetail = {
	_id: { $oid: "aaa111" },
	name: "Research Canvas",
	description: "AI research notes",
	isTemplate: false,
	ownerId: "owner1",
	nodes: [
		{
			_id: { $oid: "n1" },
			color: "#ffffff",
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
			height: 200,
			width: 320,
			x: 0,
			y: 0,
			data: {
				_type: "Document" as const,
				_id: { $oid: "doc-n1" },
				content: {
					_type: "Text" as const,
					_content: { text: "Gathered research findings" },
				},
				title: "Findings",
				createdAt: "2026-01-01T00:00:00Z",
				updatedAt: "2026-01-01T00:00:00Z",
				generated: true,
				ownerId: "owner1",
			},
		},
	],
	edges: [],
};

async function createConnectedClient(envOverrides?: Record<string, string>) {
	const originalEnv = { ...process.env };
	if (envOverrides) {
		Object.assign(process.env, envOverrides);
	}

	const server = createRyzomeMcpServer();

	// Restore env after server creation (config is resolved at creation time)
	process.env = originalEnv;

	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();

	await server.connect(serverTransport);

	const client = new Client({ name: "test-client", version: "1.0.0" });
	await client.connect(clientTransport);

	return { client, server };
}

describe("MCP resources", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv, RYZOME_API_KEY: "test-key" };
	});

	afterEach(() => {
		process.env = originalEnv;
		vi.restoreAllMocks();
	});

	it("lists resources including canvas-list and canvas template", async () => {
		vi.spyOn(RyzomeClient.prototype, "listCanvases").mockResolvedValue({
			data: mockCanvases,
		});

		const { client } = await createConnectedClient({
			RYZOME_API_KEY: "test-key",
		});
		const result = await client.listResources();

		// Should have the static canvas-list resource
		const staticResource = result.resources.find(
			(r) => r.uri === "ryzome://canvases",
		);
		expect(staticResource).toBeDefined();

		// Should also list dynamic resources from the template's list callback
		const dynamicResources = result.resources.filter((r) =>
			r.uri.startsWith("ryzome://canvas/"),
		);
		expect(dynamicResources).toHaveLength(2);
		expect(dynamicResources[0].name).toBe("Research Canvas");
		expect(dynamicResources[1].name).toBe("Plan Canvas");
	});

	it("reads ryzome://canvases and returns JSON canvas summaries", async () => {
		vi.spyOn(RyzomeClient.prototype, "listCanvases").mockResolvedValue({
			data: mockCanvases,
		});

		const { client } = await createConnectedClient({
			RYZOME_API_KEY: "test-key",
		});
		const result = await client.readResource({ uri: "ryzome://canvases" });

		expect(result.contents).toHaveLength(1);
		expect(result.contents[0].mimeType).toBe("application/json");

		const content = result.contents[0];
		expect("text" in content).toBe(true);
		const text = (content as { text: string }).text;
		const parsed = JSON.parse(text);
		expect(parsed).toHaveLength(2);
		expect(parsed[0].id).toBe("aaa111");
		expect(parsed[0].name).toBe("Research Canvas");
		expect(parsed[0].url).toBe("https://ryzome.ai/canvas/aaa111");
		expect(parsed[1].id).toBe("bbb222");
	});

	it("reads ryzome://canvas/{id} and returns markdown", async () => {
		vi.spyOn(RyzomeClient.prototype, "getCanvas").mockResolvedValue(
			mockCanvasDetail as ReturnType<
				typeof RyzomeClient.prototype.getCanvas
			> extends Promise<infer T>
				? T
				: never,
		);

		const { client } = await createConnectedClient({
			RYZOME_API_KEY: "test-key",
		});
		const result = await client.readResource({
			uri: "ryzome://canvas/aaa111",
		});

		expect(result.contents).toHaveLength(1);
		expect(result.contents[0].mimeType).toBe("text/markdown");

		const content = result.contents[0];
		expect("text" in content).toBe(true);
		const md = (content as { text: string }).text;
		expect(md).toContain("# Research Canvas");
		expect(md).toContain("AI research notes");
		expect(md).toContain("### Findings");
		expect(md).toContain("Gathered research findings");
	});

	it("returns error text for resources when API key is missing", async () => {
		// Clear all key env vars BEFORE creating the server so config resolves null
		delete process.env.RYZOME_API_KEY;
		delete process.env.RYZOME_OPENCLAW_API_KEY;
		delete process.env.PLUGIN_USER_CONFIG_API_KEY;

		const server = createRyzomeMcpServer();
		const [clientTransport, serverTransport] =
			InMemoryTransport.createLinkedPair();
		await server.connect(serverTransport);

		const client = new Client({ name: "test-client", version: "1.0.0" });
		await client.connect(clientTransport);

		const result = await client.readResource({ uri: "ryzome://canvases" });

		expect(result.contents).toHaveLength(1);
		const content = result.contents[0];
		expect("text" in content).toBe(true);
		expect((content as { text: string }).text).toContain("not configured");
	});
});
