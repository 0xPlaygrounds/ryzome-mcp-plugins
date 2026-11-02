import { buildDocumentViewAppUrl } from "./app-url.js";
import type { BundleDocument } from "./client/bundle.js";
import type { ConversationView } from "./client/conversation.js";
import {
	type CanvasEditorView,
	type DocumentView,
	unwrapNodeData,
} from "./client/index.js";
import { buildConversationAppUrl } from "./format-conversation-markdown.js";

/** Machine-readable projections returned as MCP `structuredContent`. */

export type StructuredCanvasNode = {
	id: string;
	kind: "document" | "group" | "unavailable";
	documentId?: string;
	title?: string;
	x: number;
	y: number;
	width: number;
	height: number;
	color: string;
	state: "Authorized" | "NotFound" | "Unauthorized" | "Error";
};

export type StructuredCanvasEdge = {
	id: string;
	from: string;
	to: string;
	label: string;
	color: string;
};

export type StructuredCanvas = {
	id: string;
	title: string;
	nodes: StructuredCanvasNode[];
	edges: StructuredCanvasEdge[];
};

function toStructuredCanvasNode(
	node: CanvasEditorView["nodes"][number],
): StructuredCanvasNode {
	const data = unwrapNodeData(node.data);
	const base = {
		id: node._id.$oid,
		x: node.x,
		y: node.y,
		width: node.width,
		height: node.height,
		color: node.color,
	};
	if (data.kind === "document") {
		return {
			...base,
			kind: "document",
			documentId: data.document._id.$oid,
			title: data.document.title ?? "Untitled",
			state: "Authorized",
		};
	}
	if (data.kind === "group") {
		return {
			...base,
			kind: "group",
			...(data.title ? { title: data.title } : {}),
			state: "Authorized",
		};
	}
	return {
		...base,
		kind: "unavailable",
		...(data.id ? { documentId: data.id } : {}),
		state: data.state,
	};
}

export function toStructuredCanvas(canvas: CanvasEditorView): StructuredCanvas {
	return {
		id: canvas._id.$oid,
		title: canvas.name,
		nodes: canvas.nodes.map(toStructuredCanvasNode),
		edges: canvas.edges.map((edge) => ({
			id: edge._id.$oid,
			from: edge.fromNode.$oid,
			to: edge.toNode.$oid,
			label: edge.label,
			color: edge.color,
		})),
	};
}

export type StructuredDocument = {
	id: string;
	title: string;
	kind: DocumentView["content"]["_type"];
	tags: string[];
	viewUrl: string;
	text?: string;
	url?: string;
	videoId?: string;
	file?: {
		storage: "s3Object" | "googleDriveObject";
		fileType: string;
		key?: string;
		downloadUrl?: string;
		driveId?: string;
	};
};

export function toStructuredDocument(
	document: DocumentView,
	appUrl: string,
): StructuredDocument {
	const base: StructuredDocument = {
		id: document._id.$oid,
		title: document.title ?? "Untitled",
		kind: document.content._type,
		tags: document.tags ?? [],
		viewUrl: buildDocumentViewAppUrl(appUrl, document),
	};

	switch (document.content._type) {
		case "Text":
			return { ...base, text: document.content._content.text ?? "" };
		case "Website":
			return { ...base, url: document.content._content.url };
		case "Youtube":
			return { ...base, videoId: document.content._content.videoId };
		case "File": {
			const file = document.content._content;
			return {
				...base,
				file:
					file._type === "s3Object"
						? {
								storage: "s3Object",
								fileType: file.file_type,
								key: file.key,
								...(file.download_url
									? { downloadUrl: file.download_url }
									: {}),
							}
						: {
								storage: "googleDriveObject",
								fileType: file.file_type,
								driveId: file.id,
							},
			};
		}
		default:
			return base;
	}
}

export type StructuredBundleMember = {
	id: string;
	state: "Authorized" | "NotFound" | "Unauthorized" | "Error";
	title?: string;
	kind?: string;
	message?: string;
};

export type StructuredBundle = {
	id: string;
	title: string;
	members: StructuredBundleMember[];
};

export function toStructuredBundle(bundle: BundleDocument): StructuredBundle {
	return {
		id: bundle._id.$oid,
		title: bundle.title ?? "Untitled",
		members: bundle.content._content.documentsMetadata.map((member) => {
			switch (member._type) {
				case "Authorized":
					return {
						id: member._content._id.$oid,
						state: "Authorized" as const,
						title: member._content.title ?? "Untitled",
						kind: member._content.content._type,
					};
				case "Error":
					return {
						id: member._content.documentId.$oid,
						state: "Error" as const,
						message: member._content.message,
					};
				default:
					return { id: member._content.$oid, state: member._type };
			}
		}),
	};
}

export type StructuredConversation = {
	id: string;
	title: string;
	viewUrl: string;
	context: Array<{ id: string; title?: string; kind?: string }>;
	messages: Array<{ id: string; role: "user" | "assistant"; text: string }>;
};

function messageText(message: ConversationView["messages"][number]): string {
	if (message.content._type === "user") {
		return message.content.content.map((part) => part.text).join("\n");
	}
	return message.content.content
		.filter(
			(part): part is { _type: "text"; text: string } => part._type === "text",
		)
		.map((part) => part.text)
		.join("\n");
}

export function toStructuredConversation(
	conversation: ConversationView,
	appUrl: string,
): StructuredConversation {
	return {
		id: conversation._id.$oid,
		title: conversation.title,
		viewUrl: buildConversationAppUrl(appUrl, conversation._id.$oid),
		context: conversation.context.map((context) => ({
			id: context.id.$oid,
			...(context.title ? { title: context.title } : {}),
			...(context.content?._type ? { kind: context.content._type } : {}),
		})),
		messages: conversation.messages.map((message) => ({
			id: message._id.$oid,
			role: message.content._type,
			text: messageText(message).trim(),
		})),
	};
}

export type CanvasCreationResult = {
	id: string;
	viewUrl: string;
	nodeCount: number;
	edgeCount: number;
};
export type CanvasUpdateResult = {
	id: string;
	viewUrl: string;
	operationCount: number;
};
export type DocumentCreationResult = {
	id: string;
	title: string;
	kind: DocumentView["content"]["_type"];
	viewUrl: string;
};
export type StructuredToolResult =
	| StructuredCanvas
	| StructuredDocument
	| StructuredBundle
	| StructuredConversation
	| CanvasCreationResult
	| CanvasUpdateResult
	| DocumentCreationResult
	| import("./verify-structure.js").StructureReport;
