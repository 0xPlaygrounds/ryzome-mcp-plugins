import { afterEach, describe, expect, it, vi } from "vitest";
import { executeGetBundle } from "../get-bundle.js";
import { executeGetCanvas } from "../get-canvas.js";
import { executeGetConversation } from "../get-conversation.js";
import { executeGetDocument } from "../get-document.js";

const id = "0123456789abcdef01234567";
const config = {
	apiKey: "test-key",
	apiUrl: "https://api.example.com",
	appUrl: "https://app.example.com",
};

function response(data: unknown) {
	return new Response(JSON.stringify(data), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

const base = {
	_id: { $oid: id },
	generated: false,
	inLibrary: true,
	pinned: false,
	ownerId: "owner",
	tags: ["t1"],
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

afterEach(() => vi.unstubAllGlobals());

describe("structuredContent (A10)", () => {
	it("get_ryzome_canvas returns nodes and edges in the structured shape", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				response({
					...base,
					title: "Map",
					content: {
						_type: "Canvas",
						_content: {
							nodes: [
								{
									_id: { $oid: "1123456789abcdef01234567" },
									color: "#FFAA00",
									createdAt: "2026-01-01T00:00:00Z",
									updatedAt: "2026-01-01T00:00:00Z",
									x: 1,
									y: 2,
									width: 320,
									height: 180,
									data: {
										_type: "Authorized",
										_content: {
											...base,
											_type: "Document",
											_id: { $oid: "a123456789abcdef01234567" },
											title: "Intro",
											content: { _type: "Text", _content: { text: "hi" } },
										},
									},
								},
								{
									_id: { $oid: "2123456789abcdef01234567" },
									color: "#EEEEEE",
									createdAt: "2026-01-01T00:00:00Z",
									updatedAt: "2026-01-01T00:00:00Z",
									x: 0,
									y: 0,
									width: 800,
									height: 600,
									data: {
										_type: "Authorized",
										_content: { _type: "Group", title: "Frame" },
									},
								},
								{
									_id: { $oid: "3123456789abcdef01234567" },
									color: "#FFFFFF",
									createdAt: "2026-01-01T00:00:00Z",
									updatedAt: "2026-01-01T00:00:00Z",
									x: 5,
									y: 6,
									width: 320,
									height: 180,
									data: {
										_type: "Unauthorized",
										_content: { $oid: "b123456789abcdef01234567" },
									},
								},
							],
							edges: [
								{
									_id: { $oid: "4123456789abcdef01234567" },
									color: "#000000",
									createdAt: "2026-01-01T00:00:00Z",
									updatedAt: "2026-01-01T00:00:00Z",
									fromNode: { $oid: "1123456789abcdef01234567" },
									fromSide: "bottom",
									toNode: { $oid: "3123456789abcdef01234567" },
									toSide: "top",
									label: "leads",
								},
							],
						},
					},
				}),
			),
		);

		const result = await executeGetCanvas({ canvas_id: id }, config);
		expect(result.structuredContent).toEqual({
			id,
			title: "Map",
			nodes: [
				{
					id: "1123456789abcdef01234567",
					kind: "document",
					documentId: "a123456789abcdef01234567",
					title: "Intro",
					x: 1,
					y: 2,
					w: 320,
					h: 180,
					color: "#FFAA00",
					state: "Authorized",
				},
				{
					id: "2123456789abcdef01234567",
					kind: "group",
					title: "Frame",
					x: 0,
					y: 0,
					w: 800,
					h: 600,
					color: "#EEEEEE",
					state: "Authorized",
				},
				{
					id: "3123456789abcdef01234567",
					kind: "unavailable",
					documentId: "b123456789abcdef01234567",
					x: 5,
					y: 6,
					w: 320,
					h: 180,
					color: "#FFFFFF",
					state: "Unauthorized",
				},
			],
			edges: [
				{
					id: "4123456789abcdef01234567",
					from: "1123456789abcdef01234567",
					to: "3123456789abcdef01234567",
					label: "leads",
					color: "#000000",
				},
			],
		});
		expect(JSON.parse(result.content[0].text).nodeCount).toBe(3);
	});

	it("get_ryzome_document projects text, website, youtube, and file documents", async () => {
		const cases: Array<[unknown, Record<string, unknown>]> = [
			[
				{ _type: "Text", _content: { text: "Body" } },
				{ kind: "Text", text: "Body" },
			],
			[
				{ _type: "Website", _content: { url: "https://example.com" } },
				{ kind: "Website", url: "https://example.com" },
			],
			[
				{ _type: "Youtube", _content: { videoId: "abc123" } },
				{ kind: "Youtube", videoId: "abc123" },
			],
			[
				{
					_type: "File",
					_content: {
						_type: "s3Object",
						key: "uploads/x.png",
						file_type: "image/png",
						download_url: "https://cdn/x.png",
					},
				},
				{
					kind: "File",
					file: {
						storage: "s3Object",
						fileType: "image/png",
						key: "uploads/x.png",
						downloadUrl: "https://cdn/x.png",
					},
				},
			],
		];

		for (const [content, expected] of cases) {
			vi.stubGlobal(
				"fetch",
				vi.fn().mockResolvedValue(response({ ...base, title: "Doc", content })),
			);
			const result = await executeGetDocument({ document_id: id }, config);
			expect(result.structuredContent).toEqual({
				id,
				title: "Doc",
				tags: ["t1"],
				viewUrl: `https://app.example.com/workspace?document=${id}`,
				...expected,
			});
		}
	});

	it("get_ryzome_bundle projects member access states", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				response({
					...base,
					title: "Pack",
					content: {
						_type: "Bundle",
						_content: {
							documentsMetadata: [
								{
									_type: "Authorized",
									_content: {
										_id: { $oid: "a123456789abcdef01234567" },
										title: "Notes",
										content: { _type: "Text" },
									},
								},
								{
									_type: "NotFound",
									_content: { $oid: "b123456789abcdef01234567" },
								},
								{
									_type: "Error",
									_content: {
										documentId: { $oid: "c123456789abcdef01234567" },
										message: "boom",
									},
								},
							],
						},
					},
				}),
			),
		);

		const result = await executeGetBundle({ bundle_id: id }, config);
		expect(result.structuredContent).toEqual({
			id,
			title: "Pack",
			members: [
				{
					id: "a123456789abcdef01234567",
					state: "Authorized",
					title: "Notes",
					kind: "Text",
				},
				{ id: "b123456789abcdef01234567", state: "NotFound" },
				{ id: "c123456789abcdef01234567", state: "Error", message: "boom" },
			],
		});
	});

	it("get_ryzome_conversation projects context and messages", async () => {
		const date = { $date: { $numberLong: "1767225600000" } };
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				response({
					_id: { $oid: id },
					title: "Sync",
					ownerId: "owner",
					createdAt: date,
					updatedAt: date,
					richContext: [],
					context: [
						{
							id: { $oid: "a123456789abcdef01234567" },
							title: "Notes",
							content: { _type: "Text" },
						},
					],
					messages: [
						{
							_id: { $oid: "b123456789abcdef01234567" },
							conversationId: { $oid: id },
							content: {
								_type: "user",
								content: [{ _type: "text", text: "Hello" }],
							},
							richContext: [],
							createdAt: date,
							updatedAt: date,
						},
						{
							_id: { $oid: "c123456789abcdef01234567" },
							conversationId: { $oid: id },
							content: {
								_type: "assistant",
								content: [
									{ _type: "reasoning", text: "thinking" },
									{ _type: "text", text: "Hi back" },
								],
							},
							richContext: [],
							createdAt: date,
							updatedAt: date,
						},
					],
				}),
			),
		);

		const result = await executeGetConversation(
			{ conversation_id: id },
			config,
		);
		expect(result.structuredContent).toEqual({
			id,
			title: "Sync",
			viewUrl: `https://app.example.com/workspace?conversation=${id}`,
			context: [
				{ id: "a123456789abcdef01234567", title: "Notes", kind: "Text" },
			],
			messages: [
				{ id: "b123456789abcdef01234567", role: "user", text: "Hello" },
				{ id: "c123456789abcdef01234567", role: "assistant", text: "Hi back" },
			],
		});
	});
});
