import { z } from "zod";
import {
	bundleDocumentSchema,
	patchBundleResponseSchema,
	type BundleDocument,
	type PatchBundleRequest,
} from "./client/bundle.js";
import {
	addMessageResponseSchema,
	conversationSummarySchema,
	conversationViewSchema,
	createConversationResponseSchema,
	messageResponseSchema,
	type AddMessageRequest,
	type ConversationSummary,
	type ConversationView,
	type CreateConversationRequest,
	type MessageView,
	type UpdateConversationRequest,
} from "./client/conversation.js";
import { documentListResponseSchema } from "./client/document-list.js";
import {
	type CanvasEditorView,
	createApiClient,
	type CreateCanvasRequest,
	type CreateCanvasResponse,
	type CreateDocumentRequestDocument,
	type DocumentContentView,
	type DocumentView,
	type GetUploadUrlResponse,
	type ListCanvasesResponse,
	type ListDocumentsResponse,
	type PatchCanvasRequest,
	type PatchDocumentRequest,
	type UpdateDocumentMetadataRequest,
	type UpdateDocumentMetadataResponse,
} from "./client/index.js";

export type RyzomeClientAuthMode = "apiKey" | "bearer";

export interface RyzomeClientConfig {
	/** API key, sent as `x-api-key`. Required unless `accessToken` is set. */
	apiKey?: string;
	/** Bearer token, sent as `Authorization: Bearer <token>` in bearer mode. */
	accessToken?: string;
	/** Defaults to "bearer" when only `accessToken` is present, otherwise "apiKey". */
	authMode?: RyzomeClientAuthMode;
	apiUrl: string;
	appUrl: string;
}

export type RyzomeRequestStage =
	| "createCanvas"
	| "createDocument"
	| "createConversation"
	| "getCanvas"
	| "getDocument"
	| "getConversation"
	| "listConversations"
	| "listDocuments"
	| "searchConversations"
	| "patchCanvas"
	| "patchDocument"
	| "patchBundle"
	| "patchConversation"
	| "addConversationMessage"
	| "listConversationMessages"
	| "deleteConversations"
	| "updateDocumentMetadata"
	| "patchSharingConfig"
	| "getUploadUrl"
	| "uploadFile";

export interface ListDocumentsOptions {
	tag?: string;
	favorite?: boolean;
	inLibraryOnly?: boolean;
	contentTypes?: DocumentContentView["_type"][];
}

function isRetryableStatus(status: number): boolean {
	return status === 408 || status === 429 || status >= 500;
}

function stringifyErrorBody(value: unknown): string {
	if (typeof value === "string") return value;
	if (value instanceof Error) return value.message;
	if (value == null) return "";

	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

function buildErrorMessage(params: {
	stage: RyzomeRequestStage;
	method: string;
	path: string;
	status: number;
	body: string;
	canvasId?: string;
	documentId?: string;
	conversationId?: string;
}) {
	const context = [
		`${params.stage} failed`,
		`${params.method} ${params.path}`,
		`status=${params.status}`,
		params.canvasId ? `canvasId=${params.canvasId}` : null,
		params.documentId ? `documentId=${params.documentId}` : null,
		params.conversationId ? `conversationId=${params.conversationId}` : null,
	]
		.filter(Boolean)
		.join(" | ");

	return params.body ? `${context} | body=${params.body}` : context;
}

export class RyzomeApiError extends Error {
	readonly stage: RyzomeRequestStage;
	readonly method: string;
	readonly path: string;
	readonly status: number;
	readonly body: string;
	readonly retryable: boolean;
	readonly canvasId?: string;
	readonly documentId?: string;
	readonly conversationId?: string;

	constructor(params: {
		stage: RyzomeRequestStage;
		method: string;
		path: string;
		status: number;
		body: string;
		retryable: boolean;
		canvasId?: string;
		documentId?: string;
		conversationId?: string;
		cause?: unknown;
	}) {
		super(buildErrorMessage(params), { cause: params.cause });
		this.name = "RyzomeApiError";
		this.stage = params.stage;
		this.method = params.method;
		this.path = params.path;
		this.status = params.status;
		this.body = params.body;
		this.retryable = params.retryable;
		this.canvasId = params.canvasId;
		this.documentId = params.documentId;
		this.conversationId = params.conversationId;
	}
}

type CanvasApiClient = ReturnType<typeof createApiClient>;

export function resolveAuthMode(
	config: Pick<RyzomeClientConfig, "apiKey" | "accessToken" | "authMode">,
): RyzomeClientAuthMode {
	if (config.authMode) return config.authMode;
	return !config.apiKey && config.accessToken ? "bearer" : "apiKey";
}

function makeAuthMiddleware(config: RyzomeClientConfig) {
	const mode = resolveAuthMode(config);
	if (mode === "bearer" && !config.accessToken) {
		throw new Error("RyzomeClient: bearer auth mode requires accessToken");
	}
	if (mode === "apiKey" && !config.apiKey) {
		throw new Error("RyzomeClient: apiKey auth mode requires apiKey");
	}

	return {
		async onRequest({ request }: { request: Request }) {
			const headers = new Headers(request.headers);
			if (mode === "bearer") {
				headers.set("Authorization", `Bearer ${config.accessToken}`);
			} else {
				headers.set("x-api-key", config.apiKey as string);
			}
			headers.set("Content-Type", "application/json");
			headers.set("User-Agent", `RyzomeOpenclawPlugin/0.1.0`);

			return new Request(request, { headers });
		},
	};
}

function makeResponseCaptureMiddleware(
	responseBodies: WeakMap<Response, string>,
) {
	return {
		async onResponse({ response }: { response: Response }) {
			const body = await response
				.clone()
				.text()
				.catch(() => "");
			responseBodies.set(response, body);
			return response;
		},
	};
}

export class RyzomeClient {
	private readonly client: CanvasApiClient;
	private readonly responseBodies = new WeakMap<Response, string>();

	constructor(config: RyzomeClientConfig) {
		this.client = createApiClient(`${config.apiUrl.replace(/\/+$/, "")}/v1`);
		this.client.use(makeAuthMiddleware(config));
		this.client.use(makeResponseCaptureMiddleware(this.responseBodies));
	}

	private buildHttpError(params: {
		stage: RyzomeRequestStage;
		method: string;
		path: string;
		response: Response;
		error: unknown;
		canvasId?: string;
		documentId?: string;
		conversationId?: string;
	}) {
		const body =
			this.responseBodies.get(params.response) ||
			stringifyErrorBody(params.error) ||
			params.response.statusText;

		return new RyzomeApiError({
			stage: params.stage,
			method: params.method,
			path: params.path,
			status: params.response.status,
			body,
			retryable: isRetryableStatus(params.response.status),
			canvasId: params.canvasId,
			documentId: params.documentId,
			conversationId: params.conversationId,
		});
	}

	private buildNetworkError(params: {
		stage: RyzomeRequestStage;
		method: string;
		path: string;
		error: unknown;
		canvasId?: string;
		documentId?: string;
		conversationId?: string;
	}) {
		return new RyzomeApiError({
			stage: params.stage,
			method: params.method,
			path: params.path,
			status: 0,
			body: stringifyErrorBody(params.error),
			retryable: true,
			canvasId: params.canvasId,
			documentId: params.documentId,
			conversationId: params.conversationId,
			cause: params.error,
		});
	}

	async createCanvas(req: CreateCanvasRequest): Promise<CreateCanvasResponse> {
		try {
			const { data, error, response } = await this.client.POST("/document", {
				body: {
					documents: [
						{
							...(req.id ? { _id: req.id } : {}),
							title: req.name,
							description: req.description,
							...(req.tags?.length ? { tags: req.tags } : {}),
							content: {
								_type: "Canvas",
								_content: {
									nodes: [],
									edges: [],
								},
							},
						},
					],
				},
			});

			if (!response.ok || !data) {
				throw this.buildHttpError({
					stage: "createCanvas",
					method: "POST",
					path: "/document",
					response,
					error,
				});
			}

			const doc = data.documents[0];
			if (!doc) {
				throw new RyzomeApiError({
					stage: "createCanvas",
					method: "POST",
					path: "/document",
					status: response.status,
					body: "Canvas creation returned no documents",
					retryable: false,
				});
			}
			if (doc.content._type !== "Canvas") {
				throw new RyzomeApiError({
					stage: "createCanvas",
					method: "POST",
					path: "/document",
					status: response.status,
					body: `Canvas creation returned a ${doc.content._type} document`,
					retryable: false,
					documentId: doc._id.$oid,
				});
			}
			return { canvas_id: doc._id };
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			throw this.buildNetworkError({
				stage: "createCanvas",
				method: "POST",
				path: "/document",
				error,
			});
		}
	}

	async createDocument(
		req: CreateDocumentRequestDocument,
	): Promise<DocumentView> {
		try {
			const { data, error, response } = await this.client.POST("/document", {
				body: {
					documents: [req],
				},
			});

			if (!response.ok || !data) {
				throw this.buildHttpError({
					stage: "createDocument",
					method: "POST",
					path: "/document",
					response,
					error,
				});
			}

			const document = data.documents[0];
			if (!document) {
				throw new RyzomeApiError({
					stage: "createDocument",
					method: "POST",
					path: "/document",
					status: response.status,
					body: "Document creation returned no documents",
					retryable: false,
				});
			}

			return document;
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			throw this.buildNetworkError({
				stage: "createDocument",
				method: "POST",
				path: "/document",
				error,
			});
		}
	}

	async getDocument(documentId: string): Promise<DocumentView> {
		const path = `/document/${documentId}`;

		try {
			const { data, error, response } = await this.client.GET(
				"/document/{document_id}",
				{
					params: { path: { document_id: documentId } },
				},
			);

			if (!response.ok || !data) {
				throw this.buildHttpError({
					stage: "getDocument",
					method: "GET",
					path,
					response,
					error,
					documentId,
				});
			}

			return data;
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			throw this.buildNetworkError({
				stage: "getDocument",
				method: "GET",
				path,
				error,
				documentId,
			});
		}
	}

	async getCanvas(canvasId: string): Promise<CanvasEditorView> {
		const data = await this.getDocument(canvasId);

		const nodes: CanvasEditorView["nodes"] =
			data.content._type === "Canvas" ? data.content._content.nodes : [];
		const edges: CanvasEditorView["edges"] =
			data.content._type === "Canvas" ? data.content._content.edges : [];

		return {
			_id: data._id,
			name: data.title ?? "Untitled",
			description: data.description,
			nodes,
			edges,
			isTemplate: false,
			ownerId: data.ownerId,
		};
	}

	async listCanvases(opts?: {
		pinned?: boolean;
	}): Promise<ListCanvasesResponse> {
		const result = await this.listDocuments({
			favorite: opts?.pinned,
			contentTypes: ["Canvas"],
			inLibraryOnly: false,
		});

		const canvases = result.data
			.filter((doc) => doc.content._type === "Canvas")
			.map((doc) => ({
				_id: doc._id,
				name: doc.title ?? "Untitled",
				description: doc.description,
				isTemplate: false,
				pinned: doc.isFavorite ?? false,
				updatedAt: doc.updatedAt,
			}));

		return { data: canvases };
	}

	async listDocuments(
		opts?: ListDocumentsOptions,
	): Promise<ListDocumentsResponse> {
		const path = "/document";

		let httpResponse: Response | undefined;
		try {
			const { data, error, response } = await this.client.GET("/document", {
				parseAs: "text",
				params: {
					query: {
						...(opts?.tag ? { tags: [opts.tag] } : {}),
						...(opts?.favorite != null ? { pinned: opts.favorite } : {}),
					},
				},
			});

			httpResponse = response;

			if (!response.ok) {
				throw this.buildHttpError({
					stage: "listDocuments",
					method: "GET",
					path,
					response,
					error,
				});
			}

			const parsed = documentListResponseSchema.safeParse(
				JSON.parse(data ?? ""),
			);
			if (!parsed.success) {
				throw new Error(
					`Invalid document list response: ${parsed.error.message}`,
				);
			}

			const documents = parsed.data.documents.filter((doc) => {
				if (opts?.inLibraryOnly && !doc.inLibrary) return false;
				if (
					opts?.contentTypes?.length &&
					!opts.contentTypes.some((type) => type === doc.content._type)
				) {
					return false;
				}
				return true;
			});

			return {
				data: documents.map((doc) => ({ ...doc, isFavorite: doc.pinned })),
			};
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			if (httpResponse) {
				throw new RyzomeApiError({
					stage: "listDocuments",
					method: "GET",
					path,
					status: httpResponse.status,
					body: stringifyErrorBody(error),
					retryable: false,
					cause: error,
				});
			}
			throw this.buildNetworkError({
				stage: "listDocuments",
				method: "GET",
				path,
				error,
			});
		}
	}

	async getBundle(bundleId: string): Promise<BundleDocument> {
		return bundleDocumentSchema.parse(await this.getDocument(bundleId));
	}

	async createBundle(params: {
		id?: string;
		title?: string;
		description?: string;
		tags?: string[];
		documentIds: string[];
	}): Promise<BundleDocument> {
		return bundleDocumentSchema.parse(
			await this.createDocument({
				...(params.id ? { _id: params.id } : {}),
				title: params.title,
				description: params.description,
				tags: params.tags,
				content: { _type: "Bundle", _content: { ids: params.documentIds } },
			}),
		);
	}

	async patchBundle(
		bundleId: string,
		request: PatchBundleRequest,
	): Promise<void> {
		const path = `/bundle/${bundleId}`;
		let httpResponse: Response | undefined;
		try {
			const { data, error, response } = await this.client.PATCH(
				"/bundle/{bundle_id}",
				{
					parseAs: "text",
					params: { path: { bundle_id: bundleId } },
					body: request,
				},
			);
			httpResponse = response;
			if (!response.ok)
				throw this.buildHttpError({
					stage: "patchBundle",
					method: "PATCH",
					path,
					response,
					error,
					documentId: bundleId,
				});
			patchBundleResponseSchema.parse(JSON.parse(data ?? ""));
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			if (httpResponse)
				throw new RyzomeApiError({
					stage: "patchBundle",
					method: "PATCH",
					path,
					status: httpResponse.status,
					body: stringifyErrorBody(error),
					retryable: false,
					cause: error,
					documentId: bundleId,
				});
			throw this.buildNetworkError({
				stage: "patchBundle",
				method: "PATCH",
				path,
				error,
				documentId: bundleId,
			});
		}
	}

	async createConversation(req: CreateConversationRequest): Promise<string> {
		let httpResponse: Response | undefined;
		try {
			const { data, error, response } = await this.client.POST(
				"/conversation",
				{
					body: req,
				},
			);

			httpResponse = response;
			if (!response.ok || !data) {
				throw this.buildHttpError({
					stage: "createConversation",
					method: "POST",
					path: "/conversation",
					response,
					error,
				});
			}

			return createConversationResponseSchema.parse(data).conversation_id;
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			if (httpResponse) {
				throw new RyzomeApiError({
					stage: "createConversation",
					method: "POST",
					path: "/conversation",
					status: httpResponse.status,
					body: stringifyErrorBody(error),
					retryable: false,
					cause: error,
				});
			}
			throw this.buildNetworkError({
				stage: "createConversation",
				method: "POST",
				path: "/conversation",
				error,
			});
		}
	}

	async getConversation(conversationId: string): Promise<ConversationView> {
		const path = `/conversation/${conversationId}`;

		let httpResponse: Response | undefined;
		try {
			const { data, error, response } = await this.client.GET(
				"/conversation/{conversation_id}",
				{
					parseAs: "text",
					params: { path: { conversation_id: conversationId } },
				},
			);

			httpResponse = response;
			if (!response.ok) {
				throw this.buildHttpError({
					stage: "getConversation",
					method: "GET",
					path,
					response,
					error,
					conversationId,
				});
			}

			return conversationViewSchema.parse(JSON.parse(data ?? ""));
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			if (httpResponse) {
				throw new RyzomeApiError({
					stage: "getConversation",
					method: "GET",
					path,
					status: httpResponse.status,
					body: stringifyErrorBody(error),
					retryable: false,
					cause: error,
					conversationId,
				});
			}
			throw this.buildNetworkError({
				stage: "getConversation",
				method: "GET",
				path,
				error,
				conversationId,
			});
		}
	}

	async listConversations(opts?: {
		pinned?: boolean;
	}): Promise<ConversationSummary[]> {
		const path = "/conversation";

		let httpResponse: Response | undefined;
		try {
			const { data, error, response } = await this.client.GET("/conversation", {
				parseAs: "text",
				params: {
					query: {
						...(opts?.pinned != null ? { pinned: opts.pinned } : {}),
					},
				},
			});

			httpResponse = response;
			if (!response.ok) {
				throw this.buildHttpError({
					stage: "listConversations",
					method: "GET",
					path,
					response,
					error,
				});
			}

			return z.array(conversationSummarySchema).parse(JSON.parse(data ?? ""));
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			if (httpResponse) {
				throw new RyzomeApiError({
					stage: "listConversations",
					method: "GET",
					path,
					status: httpResponse.status,
					body: stringifyErrorBody(error),
					retryable: false,
					cause: error,
				});
			}
			throw this.buildNetworkError({
				stage: "listConversations",
				method: "GET",
				path,
				error,
			});
		}
	}

	async searchConversations(query: string): Promise<ConversationSummary[]> {
		const path = `/conversation/search?q=${encodeURIComponent(query)}`;

		let httpResponse: Response | undefined;
		try {
			const { data, error, response } = await this.client.GET(
				"/conversation/search",
				{
					parseAs: "text",
					params: { query: { q: query } },
				},
			);

			httpResponse = response;
			if (!response.ok) {
				throw this.buildHttpError({
					stage: "searchConversations",
					method: "GET",
					path,
					response,
					error,
				});
			}

			return z.array(conversationSummarySchema).parse(JSON.parse(data ?? ""));
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			if (httpResponse) {
				throw new RyzomeApiError({
					stage: "searchConversations",
					method: "GET",
					path,
					status: httpResponse.status,
					body: stringifyErrorBody(error),
					retryable: false,
					cause: error,
				});
			}
			throw this.buildNetworkError({
				stage: "searchConversations",
				method: "GET",
				path,
				error,
			});
		}
	}

	async patchConversation(
		conversationId: string,
		req: UpdateConversationRequest,
	): Promise<void> {
		const path = `/conversation/${conversationId}`;

		try {
			const { error, response } = await this.client.PATCH(
				"/conversation/{conversation_id}",
				{
					params: { path: { conversation_id: conversationId } },
					body: req,
				},
			);

			if (!response.ok) {
				throw this.buildHttpError({
					stage: "patchConversation",
					method: "PATCH",
					path,
					response,
					error,
					conversationId,
				});
			}
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			throw this.buildNetworkError({
				stage: "patchConversation",
				method: "PATCH",
				path,
				error,
				conversationId,
			});
		}
	}

	async addConversationMessage(
		conversationId: string,
		req: AddMessageRequest,
	): Promise<MessageView> {
		const path = `/conversation/${conversationId}/messages`;

		let httpResponse: Response | undefined;
		try {
			const { data, error, response } = await this.client.POST(
				"/conversation/{conversation_id}/messages",
				{
					params: { path: { conversation_id: conversationId } },
					body: {
						content: req.content,
						agent_mode: req.agent_mode,
						// The route deserializes `context` as bson ObjectIds (extended JSON).
						context: req.context?.map((id) => ({ $oid: id })),
					},
				},
			);

			httpResponse = response;
			if (!response.ok || !data) {
				throw this.buildHttpError({
					stage: "addConversationMessage",
					method: "POST",
					path,
					response,
					error,
					conversationId,
				});
			}

			return addMessageResponseSchema.parse(data).message;
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			if (httpResponse) {
				throw new RyzomeApiError({
					stage: "addConversationMessage",
					method: "POST",
					path,
					status: httpResponse.status,
					body: stringifyErrorBody(error),
					retryable: false,
					cause: error,
					conversationId,
				});
			}
			throw this.buildNetworkError({
				stage: "addConversationMessage",
				method: "POST",
				path,
				error,
				conversationId,
			});
		}
	}

	async listConversationMessages(
		conversationId: string,
	): Promise<MessageView[]> {
		const path = `/conversation/${conversationId}/messages`;

		let httpResponse: Response | undefined;
		try {
			const { data, error, response } = await this.client.GET(
				"/conversation/{conversation_id}/messages",
				{
					parseAs: "text",
					params: { path: { conversation_id: conversationId } },
				},
			);

			httpResponse = response;
			if (!response.ok) {
				throw this.buildHttpError({
					stage: "listConversationMessages",
					method: "GET",
					path,
					response,
					error,
					conversationId,
				});
			}

			return z.array(messageResponseSchema).parse(JSON.parse(data ?? ""));
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			if (httpResponse) {
				throw new RyzomeApiError({
					stage: "listConversationMessages",
					method: "GET",
					path,
					status: httpResponse.status,
					body: stringifyErrorBody(error),
					retryable: false,
					cause: error,
					conversationId,
				});
			}
			throw this.buildNetworkError({
				stage: "listConversationMessages",
				method: "GET",
				path,
				error,
				conversationId,
			});
		}
	}

	async deleteConversations(conversationIds: string[]): Promise<boolean> {
		const path = "/conversations";

		try {
			const { data, error, response } = await this.client.DELETE(
				"/conversations",
				{
					body: { conversation_ids: conversationIds },
				},
			);

			if (!response.ok || !data) {
				throw this.buildHttpError({
					stage: "deleteConversations",
					method: "DELETE",
					path,
					response,
					error,
				});
			}

			return data.deleted;
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			throw this.buildNetworkError({
				stage: "deleteConversations",
				method: "DELETE",
				path,
				error,
			});
		}
	}

	async patchCanvas(canvasId: string, req: PatchCanvasRequest): Promise<void> {
		const path = `/canvas/${canvasId}`;

		try {
			const { error, response } = await this.client.PATCH(
				"/canvas/{canvas_id}",
				{
					params: { path: { canvas_id: canvasId } },
					body: req,
				},
			);

			if (!response.ok) {
				throw this.buildHttpError({
					stage: "patchCanvas",
					method: "PATCH",
					path,
					response,
					error,
					canvasId,
				});
			}
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			throw this.buildNetworkError({
				stage: "patchCanvas",
				method: "PATCH",
				path,
				error,
				canvasId,
			});
		}
	}

	async patchDocument(
		documentId: string,
		req: PatchDocumentRequest,
	): Promise<void> {
		const path = `/document/${documentId}`;

		try {
			const { error, response } = await this.client.PATCH(
				"/document/{document_id}",
				{
					params: { path: { document_id: documentId } },
					body: req,
				},
			);

			if (!response.ok) {
				throw this.buildHttpError({
					stage: "patchDocument",
					method: "PATCH",
					path,
					response,
					error,
					documentId,
				});
			}
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			throw this.buildNetworkError({
				stage: "patchDocument",
				method: "PATCH",
				path,
				error,
				documentId,
			});
		}
	}

	async updateDocumentMetadata(
		documentId: string,
		req: UpdateDocumentMetadataRequest,
	): Promise<UpdateDocumentMetadataResponse> {
		const path = `/document/${documentId}/metadata`;

		try {
			const { data, error, response } = await this.client.PUT(
				"/document/{document_id}/metadata",
				{
					params: { path: { document_id: documentId } },
					body: req,
				},
			);

			if (!response.ok || !data) {
				throw this.buildHttpError({
					stage: "updateDocumentMetadata",
					method: "PUT",
					path,
					response,
					error,
					documentId,
				});
			}

			return data;
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			throw this.buildNetworkError({
				stage: "updateDocumentMetadata",
				method: "PUT",
				path,
				error,
				documentId,
			});
		}
	}

	/**
	 * Request a presigned S3 upload URL.
	 * NOTE: This route currently requires cookie auth on the backend.
	 * API key auth support is being added — calls may fail with 401/403 until then.
	 */
	async requestUploadUrl(s3Key: string): Promise<GetUploadUrlResponse> {
		try {
			const { data, error, response } = await this.client.POST("/files", {
				body: { s3_key: s3Key },
			});

			if (!response.ok || !data) {
				throw this.buildHttpError({
					stage: "getUploadUrl",
					method: "POST",
					path: "/files",
					response,
					error,
				});
			}

			return data;
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			throw this.buildNetworkError({
				stage: "getUploadUrl",
				method: "POST",
				path: "/files",
				error,
			});
		}
	}

	/**
	 * Upload a file to S3 using the presigned POST URL and fields.
	 */
	async uploadFile(
		presignedUrl: string,
		fields: Record<string, string>,
		fileBuffer: Uint8Array,
		contentType: string,
	): Promise<void> {
		try {
			const formData = new FormData();
			for (const [key, value] of Object.entries(fields)) {
				formData.append(key, value);
			}
			formData.append("Content-Type", contentType);
			formData.append(
				"file",
				new Blob([fileBuffer as BlobPart], { type: contentType }),
			);

			const response = await fetch(presignedUrl, {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new RyzomeApiError({
					stage: "uploadFile",
					method: "POST",
					path: presignedUrl,
					status: response.status,
					body: await response.text().catch(() => ""),
					retryable: isRetryableStatus(response.status),
				});
			}
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			throw this.buildNetworkError({
				stage: "uploadFile",
				method: "POST",
				path: presignedUrl,
				error,
			});
		}
	}
}
