import {
	createBundleToolName,
	createBundleToolDescription,
	createBundleParamsSchema,
	executeCreateBundle,
} from "./create-bundle.js";
export {
	createBundleToolName,
	createBundleToolDescription,
	createBundleParamsSchema,
	executeCreateBundle,
} from "./create-bundle.js";
import {
	getBundleToolName,
	getBundleToolDescription,
	getBundleParamsSchema,
	executeGetBundle,
} from "./get-bundle.js";
export {
	getBundleToolName,
	getBundleToolDescription,
	getBundleParamsSchema,
	executeGetBundle,
} from "./get-bundle.js";
import {
	updateBundleToolName,
	updateBundleToolDescription,
	updateBundleParamsSchema,
	executeUpdateBundle,
} from "./update-bundle.js";
export {
	updateBundleToolName,
	updateBundleToolDescription,
	updateBundleParamsSchema,
	executeUpdateBundle,
} from "./update-bundle.js";
import {
	createConversationToolName,
	createConversationToolDescription,
	createConversationParamsSchema,
	executeCreateConversation,
} from "./create-conversation.js";
export {
	createConversationToolName,
	createConversationToolDescription,
	createConversationParamsSchema,
	executeCreateConversation,
} from "./create-conversation.js";
import {
	getConversationToolName,
	getConversationToolDescription,
	getConversationParamsSchema,
	executeGetConversation,
} from "./get-conversation.js";
export {
	getConversationToolName,
	getConversationToolDescription,
	getConversationParamsSchema,
	executeGetConversation,
} from "./get-conversation.js";
import {
	listConversationsToolName,
	listConversationsToolDescription,
	listConversationsParamsSchema,
	executeListConversations,
} from "./list-conversations.js";
export {
	listConversationsToolName,
	listConversationsToolDescription,
	listConversationsParamsSchema,
	executeListConversations,
} from "./list-conversations.js";
import {
	updateConversationToolName,
	updateConversationToolDescription,
	updateConversationParamsSchema,
	executeUpdateConversation,
} from "./update-conversation.js";
export {
	updateConversationToolName,
	updateConversationToolDescription,
	updateConversationParamsSchema,
	executeUpdateConversation,
} from "./update-conversation.js";
import {
	addConversationMessageToolName,
	addConversationMessageToolDescription,
	addConversationMessageParamsSchema,
	executeAddConversationMessage,
} from "./add-conversation-message.js";
export {
	addConversationMessageToolName,
	addConversationMessageToolDescription,
	addConversationMessageParamsSchema,
	executeAddConversationMessage,
} from "./add-conversation-message.js";
import {
	searchConversationsToolName,
	searchConversationsToolDescription,
	searchConversationsParamsSchema,
	executeSearchConversations,
} from "./search-conversations.js";
export {
	searchConversationsToolName,
	searchConversationsToolDescription,
	searchConversationsParamsSchema,
	executeSearchConversations,
} from "./search-conversations.js";
import {
	deleteConversationToolName,
	deleteConversationToolDescription,
	deleteConversationParamsSchema,
	executeDeleteConversation,
} from "./delete-conversation.js";
export {
	deleteConversationToolName,
	deleteConversationToolDescription,
	deleteConversationParamsSchema,
	executeDeleteConversation,
} from "./delete-conversation.js";
import type { ZodObject, ZodRawShape } from "zod";
import type { RyzomeClientConfig } from "../lib/ryzome-client.js";

export type ToolResult = {
	content: Array<{ type: "text"; text: string }>;
	/** Optional machine-readable projection of the text result (MCP structuredContent). */
	structuredContent?: import("../lib/structured.js").StructuredToolResult;
};

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

export {
	updateCanvasToolName,
	updateCanvasToolDescription,
	updateCanvasParamsSchema,
	executeUpdateCanvas,
} from "./update-canvas.js";

export {
	verifyStructureToolName,
	verifyStructureToolDescription,
	verifyStructureParamsSchema,
	executeVerifyStructure,
} from "./verify-structure.js";

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
import {
	updateCanvasToolName,
	updateCanvasToolDescription,
	updateCanvasParamsSchema,
	executeUpdateCanvas,
} from "./update-canvas.js";
import {
	verifyStructureToolName,
	verifyStructureToolDescription,
	verifyStructureParamsSchema,
	executeVerifyStructure,
} from "./verify-structure.js";

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
	{
		name: updateCanvasToolName,
		description: updateCanvasToolDescription,
		paramsSchema: updateCanvasParamsSchema,
		execute: executeUpdateCanvas,
	},
	{
		name: verifyStructureToolName,
		description: verifyStructureToolDescription,
		paramsSchema: verifyStructureParamsSchema,
		execute: executeVerifyStructure,
	},
	{
		name: createBundleToolName,
		description: createBundleToolDescription,
		paramsSchema: createBundleParamsSchema,
		execute: executeCreateBundle,
	},
	{
		name: getBundleToolName,
		description: getBundleToolDescription,
		paramsSchema: getBundleParamsSchema,
		execute: executeGetBundle,
	},
	{
		name: updateBundleToolName,
		description: updateBundleToolDescription,
		paramsSchema: updateBundleParamsSchema,
		execute: executeUpdateBundle,
	},
	{
		name: createConversationToolName,
		description: createConversationToolDescription,
		paramsSchema: createConversationParamsSchema,
		execute: executeCreateConversation,
	},
	{
		name: getConversationToolName,
		description: getConversationToolDescription,
		paramsSchema: getConversationParamsSchema,
		execute: executeGetConversation,
	},
	{
		name: listConversationsToolName,
		description: listConversationsToolDescription,
		paramsSchema: listConversationsParamsSchema,
		execute: executeListConversations,
	},
	{
		name: updateConversationToolName,
		description: updateConversationToolDescription,
		paramsSchema: updateConversationParamsSchema,
		execute: executeUpdateConversation,
	},
	{
		name: addConversationMessageToolName,
		description: addConversationMessageToolDescription,
		paramsSchema: addConversationMessageParamsSchema,
		execute: executeAddConversationMessage,
	},
	{
		name: searchConversationsToolName,
		description: searchConversationsToolDescription,
		paramsSchema: searchConversationsParamsSchema,
		execute: executeSearchConversations,
	},
	{
		name: deleteConversationToolName,
		description: deleteConversationToolDescription,
		paramsSchema: deleteConversationParamsSchema,
		execute: executeDeleteConversation,
	},
];
