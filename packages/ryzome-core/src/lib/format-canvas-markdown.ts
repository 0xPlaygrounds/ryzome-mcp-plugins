import { buildCanvasAppUrl } from "./app-url.js";
import {
	type CanvasEditorView,
	describeUnavailableNode,
	type NodeEditorView,
	unwrapNodeData,
} from "./client/index.js";

export type { CanvasEditorView };

function extractNodeTitle(node: NodeEditorView): string {
	const data = unwrapNodeData(node.data);
	switch (data.kind) {
		case "document":
			return data.document.title ?? "Untitled";
		case "group":
			return data.title ?? "Group";
		case "unavailable":
			return describeUnavailableNode(data);
	}
}

function extractNodeContent(node: NodeEditorView): string {
	const data = unwrapNodeData(node.data);
	if (data.kind !== "document") return "";

	const content = data.document.content;
	if (content._type === "Text") {
		return content._content.text ?? "";
	}
	if (content._type === "File") {
		return "[File attachment]";
	}
	return "";
}

export function formatCanvasAsMarkdown(
	canvas: CanvasEditorView,
	opts?: { appUrl?: string },
): string {
	const lines: string[] = [];

	lines.push(`# ${canvas.name}`);
	if (canvas.description) {
		lines.push("", canvas.description);
	}
	if (opts?.appUrl) {
		lines.push(
			"",
			`> View: ${buildCanvasAppUrl(opts.appUrl, canvas._id.$oid)}`,
		);
	}

	const nodeIndex = new Map<string, { idx: number; title: string }>();
	canvas.nodes.forEach((n, i) => {
		nodeIndex.set(n._id.$oid, { idx: i + 1, title: extractNodeTitle(n) });
	});

	if (canvas.nodes.length > 0) {
		lines.push("", `## Nodes (${canvas.nodes.length})`);

		for (const node of canvas.nodes) {
			const title = extractNodeTitle(node);
			const content = extractNodeContent(node);
			lines.push("", `### ${title}`);
			if (content) {
				lines.push("", content);
			}
		}
	}

	if (canvas.edges.length > 0) {
		lines.push("", `## Connections (${canvas.edges.length})`);

		for (const edge of canvas.edges) {
			const from = nodeIndex.get(edge.fromNode.$oid);
			const to = nodeIndex.get(edge.toNode.$oid);
			const fromLabel = from?.title ?? edge.fromNode.$oid;
			const toLabel = to?.title ?? edge.toNode.$oid;
			const label = edge.label ? ` (${edge.label})` : "";
			lines.push(`- ${fromLabel} → ${toLabel}${label}`);
		}
	}

	return lines.join("\n");
}
