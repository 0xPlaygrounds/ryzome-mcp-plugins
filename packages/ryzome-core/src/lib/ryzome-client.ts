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

export interface RyzomeClientConfig {
	apiKey: string;
	apiUrl: string;
	appUrl: string;
}

export type RyzomeRequestStage =
	| "createCanvas"
	| "createDocument"
	| "getCanvas"
	| "getDocument"
	| "listCanvases"
	| "listDocuments"
	| "patchCanvas"
	| "patchDocument"
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
}) {
	const context = [
		`${params.stage} failed`,
		`${params.method} ${params.path}`,
		`status=${params.status}`,
		params.canvasId ? `canvasId=${params.canvasId}` : null,
		params.documentId ? `documentId=${params.documentId}` : null,
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

	constructor(params: {
		stage: RyzomeRequestStage;
		method: string;
		path: string;
		status: number;
		body: string;
		retryable: boolean;
		canvasId?: string;
		documentId?: string;
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
	}
}

type CanvasApiClient = ReturnType<typeof createApiClient>;

function makeApiKeyMiddleware(apiKey: string) {
	return {
		async onRequest({ request }: { request: Request }) {
			const headers = new Headers(request.headers);
			headers.set("x-api-key", apiKey);
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
		this.client.use(makeApiKeyMiddleware(config.apiKey));
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
		});
	}

	private buildNetworkError(params: {
		stage: RyzomeRequestStage;
		method: string;
		path: string;
		error: unknown;
		canvasId?: string;
		documentId?: string;
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
			cause: params.error,
		});
	}

	async createCanvas(req: CreateCanvasRequest): Promise<CreateCanvasResponse> {
		try {
			const { data, error, response } = await this.client.POST("/document", {
				body: {
					documents: [
						{
							title: req.name,
							description: req.description,
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

	async createDocument(req: CreateDocumentRequestDocument): Promise<DocumentView> {
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

		try {
			const { data, error, response } = await this.client.GET("/document", {
				params: {
					query: {
						...(opts?.tag ? { tag: opts.tag } : {}),
						...(opts?.favorite != null ? { isFavorite: opts.favorite } : {}),
					},
				},
			});

			if (!response.ok || !data) {
				throw this.buildHttpError({
					stage: "listDocuments",
					method: "GET",
					path,
					response,
					error,
				});
			}

			const documents = data.filter((doc) => {
				if (opts?.inLibraryOnly && !doc.inLibrary) return false;
				if (
					opts?.contentTypes?.length &&
					!opts.contentTypes.includes(doc.content._type)
				) {
					return false;
				}
				return true;
			});

			return { data: documents };
		} catch (error) {
			if (error instanceof RyzomeApiError) throw error;
			throw this.buildNetworkError({
				stage: "listDocuments",
				method: "GET",
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
