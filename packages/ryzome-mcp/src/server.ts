import {
	McpServer,
	ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	buildCanvasAppUrl,
	buildDocumentViewAppUrl,
	formatDocumentAsMarkdown,
	parseConfig,
	RyzomeApiError,
	RyzomeClient,
	toolRegistry,
	formatCanvasAsMarkdown,
} from "@ryzome-ai/ryzome-core";
import type {
	CanvasEditorView,
	DocumentView,
	RyzomeClientConfig,
} from "@ryzome-ai/ryzome-core";

function resolveClientConfig(): RyzomeClientConfig | null {
	const cfg = parseConfig({});
	if (!cfg.apiKey) return null;
	return { apiKey: cfg.apiKey, apiUrl: cfg.apiUrl, appUrl: cfg.appUrl };
}

function notConfiguredError() {
	return {
		content: [
			{
				type: "text" as const,
				text: "Ryzome API key not configured. Set the RYZOME_API_KEY environment variable.",
			},
		],
		isError: true,
	};
}

export function createRyzomeMcpServer(): McpServer {
	const server = new McpServer({
		name: "ryzome",
		version: "0.2.0",
	});

	const clientConfig = resolveClientConfig();

	// ── Tools ──────────────────────────────────────────────

	for (const tool of toolRegistry) {
		server.tool(
			tool.name,
			tool.description,
			tool.paramsSchema.shape,
			async (params) => {
				if (!clientConfig) return notConfiguredError();

				try {
					return await tool.execute(params, clientConfig);
				} catch (error) {
					const message =
						error instanceof RyzomeApiError
							? `Ryzome API error: ${error.message}`
							: error instanceof Error
								? error.message
								: String(error);

					return {
						content: [{ type: "text" as const, text: message }],
						isError: true,
					};
				}
			},
		);
	}

	// ── Resources ──────────────────────────────────────────

	// Static resource: list all canvases
	server.resource(
		"canvas-list",
		"ryzome://canvases",
		{
			description:
				"List all Ryzome canvases with their IDs, names, and descriptions",
			mimeType: "application/json",
		},
		async (uri) => {
			if (!clientConfig) {
				return {
					contents: [
						{
							uri: uri.href,
							mimeType: "text/plain" as const,
							text: "Ryzome API key not configured.",
						},
					],
				};
			}

			const client = new RyzomeClient(clientConfig);
			const result = await client.listCanvases();
			const summaries = result.data.map((c) => ({
				id: c._id.$oid,
				name: c.name,
				description: c.description ?? null,
				pinned: c.pinned ?? false,
				updatedAt: c.updatedAt,
				url: buildCanvasAppUrl(clientConfig.appUrl, c._id.$oid),
			}));

			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "application/json" as const,
						text: JSON.stringify(summaries, null, 2),
					},
				],
			};
		},
	);

	// Static resource: list all documents
	server.resource(
		"document-list",
		"ryzome://documents",
		{
			description:
				"List all Ryzome documents with their IDs, titles, content types, and URLs",
			mimeType: "application/json",
		},
		async (uri) => {
			if (!clientConfig) {
				return {
					contents: [
						{
							uri: uri.href,
							mimeType: "text/plain" as const,
							text: "Ryzome API key not configured.",
						},
					],
				};
			}

			const client = new RyzomeClient(clientConfig);
			const result = await client.listDocuments({ inLibraryOnly: true });
			const summaries = result.data.map((document) => ({
				id: document._id.$oid,
				title: document.title ?? "Untitled",
				description: document.description ?? null,
				contentType: document.content._type,
				inLibrary: document.inLibrary ?? false,
				isFavorite: document.isFavorite ?? false,
				updatedAt: document.updatedAt,
				url: buildDocumentViewAppUrl(clientConfig.appUrl, document),
			}));

			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "application/json" as const,
						text: JSON.stringify(summaries, null, 2),
					},
				],
			};
		},
	);

	// Dynamic resource template: get a single canvas as markdown
	server.resource(
		"canvas",
		new ResourceTemplate("ryzome://canvas/{id}", {
			list: async () => {
				if (!clientConfig) return { resources: [] };

				try {
					const client = new RyzomeClient(clientConfig);
					const result = await client.listCanvases();
					return {
						resources: result.data.map((c) => ({
							uri: `ryzome://canvas/${c._id.$oid}`,
							name: c.name,
							description: c.description ?? undefined,
							mimeType: "text/markdown" as const,
						})),
					};
				} catch {
					return { resources: [] };
				}
			},
		}),
		{
			description:
				"Retrieve a Ryzome canvas as structured markdown with nodes and connections",
			mimeType: "text/markdown",
		},
		async (uri, { id }) => {
			if (!clientConfig) {
				return {
					contents: [
						{
							uri: uri.href,
							mimeType: "text/plain" as const,
							text: "Ryzome API key not configured.",
						},
					],
				};
			}

			const client = new RyzomeClient(clientConfig);
			const canvas = await client.getCanvas(id as string);
			const markdown = formatCanvasAsMarkdown(canvas as CanvasEditorView, {
				appUrl: clientConfig.appUrl,
			});

			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "text/markdown" as const,
						text: markdown,
					},
				],
			};
		},
	);

	// Dynamic resource template: get a single document as markdown
	server.resource(
		"document",
		new ResourceTemplate("ryzome://document/{id}", {
			list: async () => {
				if (!clientConfig) return { resources: [] };

				try {
					const client = new RyzomeClient(clientConfig);
					const result = await client.listDocuments({ inLibraryOnly: true });
					return {
						resources: result.data.map((document) => ({
							uri: `ryzome://document/${document._id.$oid}`,
							name: document.title ?? "Untitled",
							description: document.description ?? undefined,
							mimeType: "text/markdown" as const,
						})),
					};
				} catch {
					return { resources: [] };
				}
			},
		}),
		{
			description:
				"Retrieve a Ryzome document as markdown, including text and content details",
			mimeType: "text/markdown",
		},
		async (uri, { id }) => {
			if (!clientConfig) {
				return {
					contents: [
						{
							uri: uri.href,
							mimeType: "text/plain" as const,
							text: "Ryzome API key not configured.",
						},
					],
				};
			}

			const client = new RyzomeClient(clientConfig);
			const document = await client.getDocument(id as string);
			const markdown = formatDocumentAsMarkdown(document as DocumentView, {
				appUrl: clientConfig.appUrl,
			});

			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "text/markdown" as const,
						text: markdown,
					},
				],
			};
		},
	);

	return server;
}
