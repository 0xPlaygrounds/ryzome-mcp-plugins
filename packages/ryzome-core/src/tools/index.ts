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
	createCanvasToolName,
	createCanvasToolDescription,
	createCanvasParamsSchema,
	executeCreateCanvas,
} from "./create-canvas.js";

export {
	getCanvasToolName,
	getCanvasToolDescription,
	getCanvasParamsSchema,
	executeGetCanvas,
} from "./get-canvas.js";

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
	uploadImageToolName,
	uploadImageToolDescription,
	uploadImageParamsSchema,
	executeUploadImage,
} from "./upload-image.js";

import {
	createCanvasToolName,
	createCanvasToolDescription,
	createCanvasParamsSchema,
	executeCreateCanvas,
} from "./create-canvas.js";
import {
	getCanvasToolName,
	getCanvasToolDescription,
	getCanvasParamsSchema,
	executeGetCanvas,
} from "./get-canvas.js";
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
	uploadImageToolName,
	uploadImageToolDescription,
	uploadImageParamsSchema,
	executeUploadImage,
} from "./upload-image.js";

export const toolRegistry: ToolEntry[] = [
	{
		name: createCanvasToolName,
		description: createCanvasToolDescription,
		paramsSchema: createCanvasParamsSchema,
		execute: executeCreateCanvas,
	},
	{
		name: getCanvasToolName,
		description: getCanvasToolDescription,
		paramsSchema: getCanvasParamsSchema,
		execute: executeGetCanvas,
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
		name: uploadImageToolName,
		description: uploadImageToolDescription,
		paramsSchema: uploadImageParamsSchema,
		execute: executeUploadImage,
	},
];
