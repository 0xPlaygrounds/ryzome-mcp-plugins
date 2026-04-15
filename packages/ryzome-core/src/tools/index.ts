import type { ZodObject, ZodRawShape } from "zod";
import type { RyzomeClientConfig } from "../lib/ryzome-client.js";

export type ToolResult = { content: Array<{ type: "text"; text: string }> };

export interface ToolEntry {
	name: string;
	description: string;
	paramsSchema: ZodObject<ZodRawShape>;
	execute: (
		rawParams: unknown,
		clientConfig: RyzomeClientConfig,
	) => Promise<ToolResult>;
}

export {
	createDocumentToolName,
	createDocumentToolDescription,
	createDocumentParamsSchema,
	executeCreateDocument,
} from "./create-document.js";

export {
	createCanvasToolName,
	createCanvasToolDescription,
	createCanvasParamsSchema,
	executeCreateCanvas,
} from "./create-canvas.js";

export {
	getDocumentToolName,
	getDocumentToolDescription,
	getDocumentParamsSchema,
	executeGetDocument,
} from "./get-document.js";

export {
	getCanvasToolName,
	getCanvasToolDescription,
	getCanvasParamsSchema,
	executeGetCanvas,
} from "./get-canvas.js";

export {
	listDocumentsToolName,
	listDocumentsToolDescription,
	listDocumentsParamsSchema,
	executeListDocuments,
} from "./list-documents.js";

export {
	listCanvasesToolName,
	listCanvasesToolDescription,
	listCanvasesParamsSchema,
	executeListCanvases,
} from "./list-canvases.js";

export {
	planCanvasToolName,
	planCanvasToolDescription,
	planCanvasParamsSchema,
	executePlanCanvas,
} from "./plan-canvas.js";

export {
	researchCanvasToolName,
	researchCanvasToolDescription,
	researchCanvasParamsSchema,
	executeResearchCanvas,
} from "./research-canvas.js";

export {
	saveNodeToLibraryToolName,
	saveNodeToLibraryToolDescription,
	saveNodeToLibraryParamsSchema,
	executeSaveNodeToLibrary,
} from "./save-node-to-library.js";

export {
	updateDocumentToolName,
	updateDocumentToolDescription,
	updateDocumentParamsSchema,
	executeUpdateDocument,
} from "./update-document.js";

export {
	uploadImageToolName,
	uploadImageToolDescription,
	uploadImageParamsSchema,
	executeUploadImage,
} from "./upload-image.js";

import {
	createDocumentToolName,
	createDocumentToolDescription,
	createDocumentParamsSchema,
	executeCreateDocument,
} from "./create-document.js";
import {
	createCanvasToolName,
	createCanvasToolDescription,
	createCanvasParamsSchema,
	executeCreateCanvas,
} from "./create-canvas.js";
import {
	getDocumentToolName,
	getDocumentToolDescription,
	getDocumentParamsSchema,
	executeGetDocument,
} from "./get-document.js";
import {
	getCanvasToolName,
	getCanvasToolDescription,
	getCanvasParamsSchema,
	executeGetCanvas,
} from "./get-canvas.js";
import {
	listDocumentsToolName,
	listDocumentsToolDescription,
	listDocumentsParamsSchema,
	executeListDocuments,
} from "./list-documents.js";
import {
	listCanvasesToolName,
	listCanvasesToolDescription,
	listCanvasesParamsSchema,
	executeListCanvases,
} from "./list-canvases.js";
import {
	planCanvasToolName,
	planCanvasToolDescription,
	planCanvasParamsSchema,
	executePlanCanvas,
} from "./plan-canvas.js";
import {
	researchCanvasToolName,
	researchCanvasToolDescription,
	researchCanvasParamsSchema,
	executeResearchCanvas,
} from "./research-canvas.js";
import {
	saveNodeToLibraryToolName,
	saveNodeToLibraryToolDescription,
	saveNodeToLibraryParamsSchema,
	executeSaveNodeToLibrary,
} from "./save-node-to-library.js";
import {
	updateDocumentToolName,
	updateDocumentToolDescription,
	updateDocumentParamsSchema,
	executeUpdateDocument,
} from "./update-document.js";
import {
	uploadImageToolName,
	uploadImageToolDescription,
	uploadImageParamsSchema,
	executeUploadImage,
} from "./upload-image.js";

export const toolRegistry: ToolEntry[] = [
	{
		name: createDocumentToolName,
		description: createDocumentToolDescription,
		paramsSchema: createDocumentParamsSchema,
		execute: executeCreateDocument,
	},
	{
		name: createCanvasToolName,
		description: createCanvasToolDescription,
		paramsSchema: createCanvasParamsSchema,
		execute: executeCreateCanvas,
	},
	{
		name: getDocumentToolName,
		description: getDocumentToolDescription,
		paramsSchema: getDocumentParamsSchema,
		execute: executeGetDocument,
	},
	{
		name: getCanvasToolName,
		description: getCanvasToolDescription,
		paramsSchema: getCanvasParamsSchema,
		execute: executeGetCanvas,
	},
	{
		name: listDocumentsToolName,
		description: listDocumentsToolDescription,
		paramsSchema: listDocumentsParamsSchema,
		execute: executeListDocuments,
	},
	{
		name: listCanvasesToolName,
		description: listCanvasesToolDescription,
		paramsSchema: listCanvasesParamsSchema,
		execute: executeListCanvases,
	},
	{
		name: planCanvasToolName,
		description: planCanvasToolDescription,
		paramsSchema: planCanvasParamsSchema,
		execute: executePlanCanvas,
	},
	{
		name: researchCanvasToolName,
		description: researchCanvasToolDescription,
		paramsSchema: researchCanvasParamsSchema,
		execute: executeResearchCanvas,
	},
	{
		name: updateDocumentToolName,
		description: updateDocumentToolDescription,
		paramsSchema: updateDocumentParamsSchema,
		execute: executeUpdateDocument,
	},
	{
		name: saveNodeToLibraryToolName,
		description: saveNodeToLibraryToolDescription,
		paramsSchema: saveNodeToLibraryParamsSchema,
		execute: executeSaveNodeToLibrary,
	},
	{
		name: uploadImageToolName,
		description: uploadImageToolDescription,
		paramsSchema: uploadImageParamsSchema,
		execute: executeUploadImage,
	},
];
