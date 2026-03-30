import type { components } from "./client/index.js";

export type CanvasEditorView = components["schemas"]["CanvasEditorView"];
type NodeEditorView = components["schemas"]["NodeEditorView"];

function extractNodeTitle(node: NodeEditorView): string {
	if (node.data._type === "Document") {
		return node.data.title ?? "Untitled";
	}
	if (node.data._type === "Group") {
		return node.data.title ?? "Group";
	}
	return "Untitled";
}

function extractNodeContent(node: NodeEditorView): string {
	if (node.data._type === "Document" && node.data.content._type === "Text") {
		return node.data.content._content.text;
	}
	if (node.data._type === "Document" && node.data.content._type === "File") {
		return "[File attachment]";
	}
	return "";
}

export function formatCanvasAsMarkdown(
	canvas: CanvasEditorView,
	opts?: { appUrl?: string },
): string {
	const lines: string[] = [];
	const appBase = opts?.appUrl?.replace(/\/+$/, "");

	lines.push(`# ${canvas.name}`);
	if (canvas.description) {
		lines.push("", canvas.description);
	}
	if (appBase) {
		lines.push("", `> View: ${appBase}/canvas/${canvas._id.$oid}`);
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
