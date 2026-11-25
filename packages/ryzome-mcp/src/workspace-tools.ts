import {
	createAuthenticatedApiClient,
	objectIdStringSchema as id,
	type ToolEntry,
} from "@ryzome-ai/ryzome-core";
import { createParser } from "eventsource-parser";
import { z } from "zod";

type Api = ReturnType<typeof createAuthenticatedApiClient>;

function tool<S extends z.ZodRawShape>(
	name: string,
	description: string,
	shape: S,
	run: (api: Api, params: z.output<z.ZodObject<S>>) => Promise<unknown>,
): ToolEntry {
	const paramsSchema = z.object(shape);
	return {
		name,
		description,
		paramsSchema,
		async execute(raw, config) {
			const value = await run(
				createAuthenticatedApiClient(config),
				paramsSchema.parse(raw),
			);
			return { content: [{ type: "text", text: JSON.stringify(value) }] };
		},
	};
}

function result<T>(reply: {
	data?: T;
	error?: unknown;
	response: Response;
}): T {
	if (!reply.response.ok || reply.data === undefined) {
		const detail =
			typeof reply.error === "string"
				? reply.error
				: JSON.stringify(reply.error);
		throw new Error(
			`Ryzome API returned HTTP ${reply.response.status}: ${detail || reply.response.statusText}`,
		);
	}
	return reply.data;
}

const collection = z.enum([
	"DOCUMENTS",
	"CONVERSATIONS",
	"PUBLIC_DOCUMENTS",
	"PUBLICATIONS",
]);
const permission = z.enum(["Read", "Comment", "Edit"]);

async function searchCollection(
	api: Api,
	query: string,
	scope: z.infer<typeof collection>,
	limit: number,
) {
	const response = await api.GET("/search", {
		params: { query: { query, scope: [scope], limit } },
		parseAs: "text",
		signal: AbortSignal.timeout(30000),
	});
	const body = result(response);
	const hits: unknown[] = [];
	let done = false;
	createParser({
		onEvent(event) {
			if (event.event === "done") {
				done = true;
				return;
			}
			const value = JSON.parse(event.data);
			if (value.error) throw new Error(String(value.error));
			hits.push(value);
		},
	}).feed(body);
	if (!done)
		throw new Error("Ryzome search ended before the results were complete.");
	return hits;
}

export const workspaceTools = [
	tool(
		"search_ryzome",
		"Search documents and conversations together, or select individual private or public collections. The limit applies per collection.",
		{
			query: z.string().trim().min(1),
			collections: z
				.array(collection)
				.min(1)
				.max(4)
				.default(["DOCUMENTS", "CONVERSATIONS"]),
			limit: z.number().int().min(1).max(100).default(10),
		},
		async (api, p) =>
			(
				await Promise.all(
					[...new Set(p.collections)].map((scope) =>
						searchCollection(api, p.query, scope, p.limit),
					),
				)
			).flat(),
	),
	tool(
		"get_ryzome_workspace_navigation",
		"Read the signed-in user’s saved workspace navigation state.",
		{},
		async (api) => result(await api.GET("/workspace/navigation-state")),
	),
	tool(
		"set_ryzome_document_sharing",
		"Replace a document's complete link permission and invite list. Omitted invitees lose their grant. Set link_permission to null to disable link access. The server may propagate sharing to nested documents.",
		{
			document_id: id,
			link_permission: permission.nullable(),
			invites: z.array(z.object({ email: z.email(), permission })),
		},
		async (api, p) =>
			result(
				await api.PUT("/document/{document_id}/sharing", {
					params: { path: { document_id: p.document_id } },
					body: { urlPermission: p.link_permission, invites: p.invites },
				}),
			),
	),
	tool(
		"publish_ryzome_document",
		"Create a public publication from a document and return its publication ID.",
		{
			document_id: id,
			name: z.string().min(1).optional(),
			description: z.string().optional(),
			tags: z.array(z.string()).default([]),
		},
		async (api, { document_id, ...body }) =>
			result(
				await api.POST("/document/{document_id}/publish", {
					params: { path: { document_id } },
					body,
				}),
			),
	),
	tool(
		"unpublish_ryzome_document",
		"Remove a public publication using its publication ID.",
		{ publication_id: id },
		async (api, path) =>
			result(
				await api.DELETE("/published/{publication_id}", { params: { path } }),
			),
	),
	tool(
		"start_ryzome_generation",
		"Start a billable AI response to an existing conversation message. Returns a generation ID. Check its status before starting another run.",
		{
			conversation_id: id,
			message_id: id,
			mode: z.enum(["chat", "agent"]).optional(),
		},
		async (api, body) => result(await api.POST("/generations", { body })),
	),
	tool(
		"get_ryzome_generation",
		"Read a generation’s status and result message ID. Read the conversation to retrieve the completed response.",
		{ generation_id: id },
		async (api, path) =>
			result(
				await api.GET("/generations/{generation_id}", { params: { path } }),
			),
	),
];
