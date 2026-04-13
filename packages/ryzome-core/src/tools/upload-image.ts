import { z } from "zod";
import { randomUUID } from "node:crypto";
import { ObjectId } from "bson";
import {
	RyzomeClient,
	type RyzomeClientConfig,
} from "../lib/ryzome-client.js";
import { retryStage } from "../lib/retry.js";

export const uploadImageToolName = "upload_ryzome_image";
export const uploadImageToolDescription =
	"Upload an image from a URL to an existing Ryzome canvas. " +
	"Fetches the image, uploads it to storage, and creates an image node on the canvas.";

const hexColorSchema = z
	.string()
	.regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex string (e.g. '#FF6B6B')")
	.optional();

export const uploadImageParamsSchema = z.object({
	canvas_id: z.string().describe("The ID of the canvas to add the image to"),
	image_url: z.string().url().describe("Public URL of the image to upload"),
	title: z.string().optional().describe("Title for the image node"),
	x: z.number().optional().describe("X position on canvas (defaults to 0)"),
	y: z.number().optional().describe("Y position on canvas (defaults to 0)"),
	width: z
		.number()
		.optional()
		.describe("Node width in pixels (defaults to 320)"),
	height: z
		.number()
		.optional()
		.describe("Node height in pixels (defaults to 240)"),
	color: hexColorSchema.describe("Node color as hex (e.g. '#FF6B6B')"),
});

function inferContentType(url: string): string {
	const pathname = new URL(url).pathname.toLowerCase();
	if (pathname.endsWith(".png")) return "image/png";
	if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg"))
		return "image/jpeg";
	if (pathname.endsWith(".gif")) return "image/gif";
	if (pathname.endsWith(".webp")) return "image/webp";
	if (pathname.endsWith(".svg")) return "image/svg+xml";
	return "image/png";
}

function inferExtension(contentType: string): string {
	const map: Record<string, string> = {
		"image/png": "png",
		"image/jpeg": "jpg",
		"image/gif": "gif",
		"image/webp": "webp",
		"image/svg+xml": "svg",
	};
	return map[contentType] ?? "png";
}

export async function executeUploadImage(
	rawParams: unknown,
	clientConfig: RyzomeClientConfig,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
	const params = uploadImageParamsSchema.parse(rawParams);
	const client = new RyzomeClient(clientConfig);

	// Fetch image from URL
	const imageResponse = await fetch(params.image_url);
	if (!imageResponse.ok) {
		return {
			content: [
				{
					type: "text",
					text: `Failed to fetch image from ${params.image_url}: HTTP ${imageResponse.status}`,
				},
			],
		};
	}

	const responseContentType = imageResponse.headers
		.get("content-type")
		?.split(";")[0];
	const contentType = responseContentType?.startsWith("image/")
		? responseContentType
		: inferContentType(params.image_url);

	const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());
	const ext = inferExtension(contentType);
	const s3Key = `canvas/${params.canvas_id}/images/${randomUUID()}.${ext}`;

	// Request presigned upload URL and upload to S3
	const uploadUrl = await retryStage(() => client.requestUploadUrl(s3Key));

	await retryStage(() =>
		client.uploadFile(
			uploadUrl.url,
			uploadUrl.fields,
			imageBuffer,
			contentType,
		),
	);

	// Create image node on canvas
	const nodeId = new ObjectId().toString();
	const operations: Array<Record<string, unknown>> = [
		{
			_type: "createNode",
			id: nodeId,
			x: params.x ?? 0,
			y: params.y ?? 0,
			width: params.width ?? 320,
			height: params.height ?? 240,
			data: {
				_type: "NewDocument",
				_content: {
					id: nodeId,
					title: params.title,
					content: {
						_type: "File",
						_content: {
							_type: "s3Object",
							key: s3Key,
							file_type: contentType,
							download_url: "",
						},
					},
					generated: true,
				},
			},
		},
	];

	if (params.color) {
		operations.push({
			_type: "setNodeColor",
			id: nodeId,
			color: params.color,
		});
	}

	await retryStage(() =>
		client.patchCanvas(params.canvas_id, {
			operations: operations as Parameters<
				RyzomeClient["patchCanvas"]
			>[1]["operations"],
		}),
	);

	const appBase = clientConfig.appUrl.replace(/\/+$/, "");
	const canvasUrl = `${appBase}/canvas/${params.canvas_id}`;

	return {
		content: [
			{
				type: "text",
				text: [
					`Image uploaded to canvas: ${canvasUrl}`,
					`Node ID: ${nodeId}`,
					`S3 key: ${s3Key}`,
				].join("\n"),
			},
		],
	};
}
