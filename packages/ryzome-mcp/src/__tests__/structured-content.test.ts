import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, expect, it, vi } from "vitest";
import { createRyzomeMcpServer } from "../server.js";

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

async function withServer<T>(fn: (client: Client) => Promise<T>): Promise<T> {
	const server = createRyzomeMcpServer();
	const client = new Client({ name: "structured-test", version: "1.0.0" });
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();
	try {
		await server.connect(serverTransport);
		await client.connect(clientTransport);
		return await fn(client);
	} finally {
		await client.close();
		await server.close();
	}
}

it("forwards structuredContent from get_ryzome_document over MCP", async () => {
	vi.stubEnv("RYZOME_API_KEY", "test-key");
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					_id: { $oid: "0123456789abcdef01234567" },
					title: "Doc",
					content: { _type: "Text", _content: { text: "Body" } },
					generated: false,
					inLibrary: true,
					pinned: false,
					ownerId: "owner",
					tags: ["x"],
					createdAt: "2026-01-01T00:00:00Z",
					updatedAt: "2026-01-01T00:00:00Z",
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		),
	);

	await withServer(async (client) => {
		const { tools } = await client.listTools();
		expect(tools.map((tool) => tool.name)).toEqual(
			expect.arrayContaining([
				"update_ryzome_canvas",
				"verify_ryzome_structure",
			]),
		);

		const result = await client.callTool({
			name: "get_ryzome_document",
			arguments: { document_id: "0123456789abcdef01234567" },
		});
		expect(result.isError).not.toBe(true);
		expect(result.structuredContent).toEqual({
			id: "0123456789abcdef01234567",
			title: "Doc",
			kind: "Text",
			tags: ["x"],
			text: "Body",
			viewUrl: "https://ryzome.ai/workspace?document=0123456789abcdef01234567",
		});
		expect(result.content).toEqual([expect.objectContaining({ type: "text" })]);
	});
});

it("uses bearer auth when only RYZOME_ACCESS_TOKEN is set", async () => {
	vi.stubEnv("RYZOME_API_KEY", "");
	vi.stubEnv("RYZOME_OPENCLAW_API_KEY", "");
	vi.stubEnv("PLUGIN_USER_CONFIG_API_KEY", "");
	vi.stubEnv("RYZOME_ACCESS_TOKEN", "eyJ.token");
	const fetch = vi.fn().mockResolvedValue(
		new Response(JSON.stringify({ documents: [] }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		}),
	);
	vi.stubGlobal("fetch", fetch);

	await withServer(async (client) => {
		const result = await client.callTool({
			name: "list_ryzome_documents",
			arguments: {},
		});
		expect(result.isError).not.toBe(true);
		const request = fetch.mock.calls[0][0] as Request;
		expect(request.headers.get("authorization")).toBe("Bearer eyJ.token");
		expect(request.headers.get("x-api-key")).toBeNull();
	});
});

it("lists both credential env vars in the not-configured hint", async () => {
	vi.stubEnv("RYZOME_API_KEY", "");
	vi.stubEnv("RYZOME_OPENCLAW_API_KEY", "");
	vi.stubEnv("PLUGIN_USER_CONFIG_API_KEY", "");
	vi.stubEnv("RYZOME_ACCESS_TOKEN", "");
	vi.stubEnv("PLUGIN_USER_CONFIG_ACCESS_TOKEN", "");

	await withServer(async (client) => {
		const result = await client.callTool({
			name: "list_ryzome_documents",
			arguments: {},
		});
		expect(result.isError).toBe(true);
		const text = (result.content as Array<{ text: string }>)[0].text;
		expect(text).toContain("RYZOME_API_KEY");
		expect(text).toContain("RYZOME_ACCESS_TOKEN");
	});
});
