import createClient from "openapi-fetch";

import type { components, paths } from "./schema";
import type {
	DocumentListItem,
	DocumentListResponse,
} from "./document-list.js";

// Override the generated list contract: the client parses the response
// through `documentListResponseSchema` (see ryzome-client.ts) and exposes a
// normalized `{ data }` envelope.
type DocumentListOperation = Omit<
	paths["/document"]["get"],
	"parameters" | "responses"
> & {
	parameters: { query?: { tags?: string[]; pinned?: boolean } };
	responses: {
		200: { content: { "application/json": DocumentListResponse } };
		500: paths["/document"]["get"]["responses"][500];
	};
};
type ApiPaths = Omit<paths, "/document"> & {
	"/document": Omit<paths["/document"], "get"> & {
		get: DocumentListOperation;
	};
};

export function createApiClient(baseUrl: string) {
	return createClient<ApiPaths>({
		baseUrl,
	});
}

export type { components };
export type CanvasSchemas = components["schemas"];

export type ObjectId = CanvasSchemas["ObjectId"];

// Client-facing canvas types. The backend has no dedicated canvas routes for
// creating/listing: RyzomeClient synthesizes these from document routes.
export type CreateCanvasRequest = {
	name: string;
	description?: string | null;
	/** Caller-supplied 24-hex document id (sent as `_id`). */
	id?: string;
	tags?: string[];
};
export type CreateCanvasResponse = { canvas_id: ObjectId };
export type CanvasSummaryView = {
	_id: ObjectId;
	description?: string | null;
	isTemplate: boolean;
	name: string;
	pinned?: boolean;
	updatedAt: string;
};
export type ListCanvasesResponse = { data: CanvasSummaryView[] };
export type CanvasEditorView = {
	_id: ObjectId;
	description?: string | null;
	edges: CanvasSchemas["Edge"][];
	isTemplate: boolean;
	name: string;
	nodes: CanvasSchemas["NodeEditorView"][];
	ownerId: string;
};
export type NodeEditorView = CanvasSchemas["NodeEditorView"];

export type PatchCanvasRequest = CanvasSchemas["api.patch_canvas.Request"];
export type PatchDocumentRequest = CanvasSchemas["api.patch_document.Request"];
export type GetUploadUrlRequest = CanvasSchemas["api.get_upload_url.Request"];
export type GetUploadUrlResponse = CanvasSchemas["api.get_upload_url.Response"];
export type UpdateDocumentMetadataRequest =
	CanvasSchemas["api.update_document_metadata.Request"];
export type UpdateDocumentMetadataResponse =
	CanvasSchemas["api.update_document_metadata.Response"];

// API types for document routes (used internally by RyzomeClient)
export type CreateDocumentsRequest =
	CanvasSchemas["api.create_documents.Request"];
export type CreateDocumentsResponse =
	CanvasSchemas["api.create_documents.Response"];
export type CreateDocumentRequestDocument =
	CanvasSchemas["api.create_documents.RequestDocument"];
export type DocumentView = CanvasSchemas["DocumentView"];
export type DocumentMetadataView = CanvasSchemas["DocumentMetadataView"];
export type DocumentContentView = CanvasSchemas["DocumentContentView"];
export type DocumentOperation = CanvasSchemas["DocumentOperation"];
export type ListDocumentsResponse = { data: DocumentListItem[] };

/** Full canvas patch operation union as generated from the backend spec. */
export type PatchOperation = CanvasSchemas["CanvasOperation"];
export type CreateNodeData = CanvasSchemas["CreateNodeData"];

// Bundle / conversation request types (zod-backed, see bundle.ts / conversation.ts)
export type { BundleContent, PatchBundleRequest } from "./bundle.js";
export type {
	AddMessageRequest,
	CreateConversationRequest,
	UpdateConversationRequest,
} from "./conversation.js";
export {
	describeUnavailableNode,
	type LegacyNodeData,
	type NodeDataAccessView,
	type NodeDocumentData,
	type NodeGroupData,
	type UnwrappedNodeData,
	unwrapNodeData,
} from "./node-data.js";
