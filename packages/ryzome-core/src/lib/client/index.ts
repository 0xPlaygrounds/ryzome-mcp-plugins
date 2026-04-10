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
export type GetUploadUrlRequest = CanvasSchemas["api.get_upload_url.Request"];
export type GetUploadUrlResponse = CanvasSchemas["api.get_upload_url.Response"];

// API types for document routes (used internally by RyzomeClient)
export type CreateDocumentsRequest =
	CanvasSchemas["api.create_documents.Request"];
export type CreateDocumentsResponse =
	CanvasSchemas["api.create_documents.Response"];
export type DocumentView = CanvasSchemas["DocumentView"];

// Canvas view types (used by downstream consumers)
export type CanvasEditorView = CanvasSchemas["CanvasEditorView"];
export type CanvasSummaryView = CanvasSchemas["CanvasSummaryView"];

export type PatchOperation = Extract<
	CanvasSchemas["Operation"],
	{ _type: "createNode" | "createEdge" | "setNodeColor" }
>;
