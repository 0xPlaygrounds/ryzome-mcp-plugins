import createClient from "openapi-fetch";

import type { components, paths } from "./schema";

export function createApiClient(baseUrl: string) {
	return createClient<paths>({
		baseUrl,
	});
}

export type { components };
export type CanvasSchemas = components["schemas"];

export type CreateCanvasRequest = CanvasSchemas["api.create_canvas.Request"];
export type CreateCanvasResponse = CanvasSchemas["api.create_canvas.Response"];
export type GetCanvasResponse =
	paths["/canvas/{canvas_id}"]["get"]["responses"][200]["content"]["application/json"];
export type ListCanvasesResponse =
	paths["/canvas"]["get"]["responses"][200]["content"]["application/json"];
export type PatchCanvasRequest = CanvasSchemas["api.patch_canvas.Request"];
export type PatchOperation = Extract<
	CanvasSchemas["Operation"],
	{ _type: "createNode" | "createEdge" | "setNodeColor" }
>;
export type GetUploadUrlRequest = CanvasSchemas["api.get_upload_url.Request"];
export type GetUploadUrlResponse = CanvasSchemas["api.get_upload_url.Response"];
