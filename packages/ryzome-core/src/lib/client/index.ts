import createClient from "openapi-fetch";

import type { components, paths } from "./schema";

export function createApiClient(baseUrl: string) {
	return createClient<paths>({
		baseUrl,
	});
}

export type { components };
export type CanvasSchemas = components["schemas"];

// Client-facing types (used by RyzomeClient method signatures)
export type CreateCanvasRequest = CanvasSchemas["api.create_canvas.Request"];
export type CreateCanvasResponse = CanvasSchemas["api.create_canvas.Response"];
export type ListCanvasesResponse = CanvasSchemas["api.get_canvases.Response"];
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
export type ListDocumentsResponse = { data: DocumentView[] };

// Canvas view types (used by downstream consumers)
export type CanvasEditorView = CanvasSchemas["CanvasEditorView"];
export type CanvasSummaryView = CanvasSchemas["CanvasSummaryView"];

export type PatchOperation = Extract<
	CanvasSchemas["Operation"],
	{ _type: "createNode" | "createEdge" | "setNodeColor" }
>;
