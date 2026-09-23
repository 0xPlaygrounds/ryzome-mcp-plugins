import { afterEach, describe, expect, it, vi } from "vitest";
import { executeCreateConversation } from "../create-conversation.js";
import { executeGetConversation } from "../get-conversation.js";
import { executeListConversations } from "../list-conversations.js";
import { executeUpdateConversation } from "../update-conversation.js";
import { executeAddConversationMessage } from "../add-conversation-message.js";
import { executeSearchConversations } from "../search-conversations.js";
import { executeDeleteConversation } from "../delete-conversation.js";
import { RyzomeClient } from "../../lib/ryzome-client.js";
import { retryStage } from "../../lib/retry.js";

const id = "0123456789abcdef01234567";
const contextId = "1123456789abcdef01234567";
const config = {
	apiKey: "test-key",
	apiUrl: "https://api.example.com",
	appUrl: "https://app.example.com",
};
const date = { $date: { $numberLong: "1767225600000" } };
const conversation = {
	_id: { $oid: id },
	title: "Project sync",
	ownerId: "owner",
	pinned: false,
	createdAt: date,
	updatedAt: date,
	context: [
		{
			id: { $oid: contextId },
			title: "Notes",
			content: { _type: "Text", _content: "hello" },
		},
	],
	messages: [
		{
			_id: { $oid: "2123456789abcdef01234567" },
			conversationId: { $oid: id },
			content: {
				_type: "user",
				content: [{ _type: "text", text: "Kickoff" }],
			},
			richContext: [],
			createdAt: date,
			updatedAt: date,
		},
		{
			_id: { $oid: "3123456789abcdef01234567" },
			conversationId: { $oid: id },
			content: {
				_type: "assistant",
				content: [
					{ _type: "text", text: "Here is the summary." },
					{ _type: "reasoning", text: "thinking" },
				],
			},
			richContext: [{ _type: "document", id: contextId }],
			createdAt: date,
			updatedAt: date,
		},
	],
	richContext: [],
};
function response(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
function mockFetch(...responses: Response[]) {
	const mock = vi.fn();
	for (const value of responses) mock.mockResolvedValueOnce(value);
	vi.stubGlobal("fetch", mock);
	return mock;
}
afterEach(() => vi.unstubAllGlobals());
describe("conversation tools and API contracts", () => {
	it("creates a conversation through the conversation API with an API key", async () => {
		const fetch = mockFetch(
			response({ conversation_id: id }),
			response(conversation),
		);
		const result = await executeCreateConversation(
			{ title: "Project sync", context: [contextId] },
			config,
		);
		const request = fetch.mock.calls[0][0] as Request;
		expect(request.method).toBe("POST");
		expect(request.url).toBe("https://api.example.com/v1/conversation");
		expect(request.headers.get("x-api-key")).toBe("test-key");
		expect(await request.json()).toEqual({
			title: "Project sync",
			context: [contextId],
		});
		expect(result.content[0].text).toContain(
			`View: https://app.example.com/workspace?conversation=${id}`,
		);
	});
	it("renders context and message history in order", async () => {
		mockFetch(response(conversation));
		const result = await executeGetConversation(
			{ conversation_id: id },
			config,
		);
		expect(result.content[0].text).toContain("# Project sync");
		expect(result.content[0].text).toContain("- Notes");
		expect(result.content[0].text).toContain("### User");
		expect(result.content[0].text).toContain("Kickoff");
		expect(result.content[0].text).toContain("### Assistant");
		expect(result.content[0].text).toContain("Here is the summary.");
	});
	it("lists conversations as JSON summaries", async () => {
		mockFetch(response([conversation]));
		const result = await executeListConversations({ pinned: true }, config);
		expect(result.content[0].text).toContain('"count": 1');
		expect(result.content[0].text).toContain(
			`"url": "https://app.example.com/workspace?conversation=${id}"`,
		);
	});
	it("sends title, pinned, and context updates to the conversation API", async () => {
		const fetch = mockFetch(
			new Response(null, { status: 200 }),
			response(conversation),
		);
		const result = await executeUpdateConversation(
			{
				conversation_id: id,
				title: "Renamed",
				pinned: true,
				context: [contextId],
				removed_context: [contextId],
			},
			config,
		);
		const request = fetch.mock.calls[0][0] as Request;
		expect(request.method).toBe("PATCH");
		expect(request.url).toBe(`https://api.example.com/v1/conversation/${id}`);
		expect(await request.json()).toEqual({
			title: "Renamed",
			pinned: true,
			context: [contextId],
			removed_context: [contextId],
		});
		expect(result.content[0].text).toContain("# Project sync");
	});
	it("rejects empty updates before making a request", async () => {
		const fetch = mockFetch();
		await expect(
			executeUpdateConversation({ conversation_id: id }, config),
		).rejects.toThrow("No conversation updates provided.");
		expect(fetch).not.toHaveBeenCalled();
	});
	it("appends a user message and returns the updated conversation", async () => {
		const fetch = mockFetch(
			response({ message: conversation.messages[0] }),
			response(conversation),
		);
		const result = await executeAddConversationMessage(
			{ conversation_id: id, text: "Follow-up", context: [contextId] },
			config,
		);
		const request = fetch.mock.calls[0][0] as Request;
		expect(request.method).toBe("POST");
		expect(request.url).toBe(
			`https://api.example.com/v1/conversation/${id}/messages`,
		);
		expect(await request.json()).toEqual({
			content: {
				_type: "user",
				content: [{ _type: "text", text: "Follow-up" }],
			},
			context: [{ $oid: contextId }],
		});
		expect(result.content[0].text).toContain("### User");
	});
	it("searches conversations by query", async () => {
		const fetch = mockFetch(response([conversation]));
		const result = await executeSearchConversations(
			{ query: "project" },
			config,
		);
		const request = fetch.mock.calls[0][0] as Request;
		expect(request.url).toBe(
			"https://api.example.com/v1/conversation/search?q=project",
		);
		expect(result.content[0].text).toContain('"count": 1');
	});
	it("deletes conversations by ID and reports the result", async () => {
		const fetch = mockFetch(response({ deleted: true }));
		const result = await executeDeleteConversation(
			{ conversation_ids: [id] },
			config,
		);
		const request = fetch.mock.calls[0][0] as Request;
		expect(request.method).toBe("DELETE");
		expect(request.url).toBe("https://api.example.com/v1/conversations");
		expect(await request.json()).toEqual({ conversation_ids: [id] });
		expect(result.content[0].text).toContain('"deleted": true');
	});
	it("rejects invalid conversation IDs before making a request", async () => {
		const fetch = mockFetch();
		await expect(
			executeGetConversation({ conversation_id: "not-an-id" }, config),
		).rejects.toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});
	it("retains not-found responses when reading a conversation", async () => {
		mockFetch(response("Conversation not found", 404));
		await expect(
			executeGetConversation({ conversation_id: id }, config),
		).rejects.toMatchObject({
			status: 404,
			retryable: false,
			stage: "getConversation",
		});
	});
	it("classifies invalid list JSON as a response error, not a retryable network failure", async () => {
		mockFetch(new Response("invalid json", { status: 200 }));
		await expect(
			new RyzomeClient(config).listConversations(),
		).rejects.toMatchObject({
			status: 200,
			retryable: false,
			stage: "listConversations",
		});
	});
	it("does not retry schema-invalid conversation creates after a successful POST", async () => {
		const fetch = mockFetch(response({ committed: true }, 201));
		await expect(
			retryStage(() =>
				new RyzomeClient(config).createConversation({ title: "Project sync" }),
			),
		).rejects.toMatchObject({
			status: 201,
			retryable: false,
			stage: "createConversation",
		});
		expect(fetch).toHaveBeenCalledOnce();
	});
	it("does not retry schema-invalid message appends after a successful POST", async () => {
		const fetch = mockFetch(response({ committed: true }, 201));
		await expect(
			retryStage(() =>
				new RyzomeClient(config).addConversationMessage(id, {
					content: {
						_type: "user",
						content: [{ _type: "text", text: "Follow-up" }],
					},
				}),
			),
		).rejects.toMatchObject({
			status: 201,
			retryable: false,
			stage: "addConversationMessage",
			conversationId: id,
		});
		expect(fetch).toHaveBeenCalledOnce();
	});
	it("normalizes BSON timestamps in conversation summaries", async () => {
		mockFetch(response([conversation]));
		const client = new RyzomeClient(config);
		const result = await client.listConversations();
		expect(result[0].createdAt).toBe("2026-01-01T00:00:00.000Z");
	});
});
