import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, expect, it, vi } from "vitest";
import { createRyzomeMcpServer } from "../server.js";

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

it("advertises conversation tools and lists conversations through MCP", async () => {
	vi.stubEnv("RYZOME_API_KEY", "test-key");
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify([
					{
						_id: { $oid: "0123456789abcdef01234567" },
						title: "Project sync",
						ownerId: "owner",
						pinned: false,
						createdAt: { $date: { $numberLong: "1767225600000" } },
						updatedAt: { $date: { $numberLong: "1767225600000" } },
						richContext: [],
					},
				]),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		),
	);
	const server = createRyzomeMcpServer();
	const client = new Client({ name: "conversation-test", version: "1.0.0" });
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();
	try {
		await server.connect(serverTransport);
		await client.connect(clientTransport);
		const { tools } = await client.listTools();
		expect(tools.map((tool) => tool.name)).toEqual(
			expect.arrayContaining([
				"create_ryzome_conversation",
				"get_ryzome_conversation",
				"list_ryzome_conversations",
				"update_ryzome_conversation",
				"add_ryzome_conversation_message",
				"search_ryzome_conversations",
				"delete_ryzome_conversation",
			]),
		);
		const result = await client.callTool({
			name: "list_ryzome_conversations",
			arguments: {},
		});
		expect(result.isError).not.toBe(true);
		expect(result.content).toEqual([
			expect.objectContaining({
				type: "text",
				text: expect.stringContaining('"count": 1'),
			}),
		]);
	} finally {
		await client.close();
		await server.close();
	}
});

it("serves the conversation list resource", async () => {
	vi.stubEnv("RYZOME_API_KEY", "test-key");
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify([
					{
						_id: { $oid: "0123456789abcdef01234567" },
						title: "Project sync",
						ownerId: "owner",
						pinned: false,
						createdAt: { $date: { $numberLong: "1767225600000" } },
						updatedAt: { $date: { $numberLong: "1767225600000" } },
						richContext: [],
					},
				]),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		),
	);
	const server = createRyzomeMcpServer();
	const client = new Client({
		name: "conversation-resource-test",
		version: "1.0.0",
	});
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();
	try {
		await server.connect(serverTransport);
		await client.connect(clientTransport);
		const result = await client.readResource({
			uri: "ryzome://conversations",
		});
		expect(result.contents[0].mimeType).toBe("application/json");
		const content = result.contents[0];
		if (!("text" in content)) throw new Error("expected text content");
		const parsed = JSON.parse(content.text);
		expect(parsed[0].id).toBe("0123456789abcdef01234567");
		expect(parsed[0].url).toBe(
			"https://ryzome.ai/workspace?conversation=0123456789abcdef01234567",
		);
	} finally {
		await client.close();
		await server.close();
	}
});
