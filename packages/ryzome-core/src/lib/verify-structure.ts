import { bundleDocumentSchema } from "./client/bundle.js";
import {
	type CanvasSchemas,
	type DocumentView,
	unwrapNodeData,
} from "./client/index.js";

export interface UnavailableEntry {
	id: string;
	state: string;
	documentId?: string | null;
	message?: string;
}

export interface EdgeIssue {
	id: string;
	from: string;
	to: string;
	label?: string;
	unknown?: Array<"from" | "to">;
}

export type StructureReport =
	| {
			kind: "Bundle";
			id: string;
			title: string;
			memberCount: number;
			availableCount: number;
			unavailable: UnavailableEntry[];
	  }
	| {
			kind: "Canvas";
			id: string;
			title: string;
			nodeCount: number;
			documentNodeCount: number;
			groupNodeCount: number;
			edgeCount: number;
			unavailable: UnavailableEntry[];
			edgesMissingLabels: EdgeIssue[];
			edgesWithUnknownNodes: EdgeIssue[];
	  }
	| { kind: string; id: string; title: string; verifiable: false };

function verifyCanvas(
	document: DocumentView,
	content: Extract<DocumentView["content"], { _type: "Canvas" }>,
): StructureReport {
	const nodes: CanvasSchemas["NodeEditorView"][] = content._content.nodes;
	const edges: CanvasSchemas["Edge"][] = content._content.edges;
	const knownNodeIds = new Set(nodes.map((n) => n._id.$oid));

	let documentNodeCount = 0;
	let groupNodeCount = 0;
	const unavailable: UnavailableEntry[] = [];
	for (const node of nodes) {
		const data = unwrapNodeData(node.data);
		if (data.kind === "document") documentNodeCount += 1;
		else if (data.kind === "group") groupNodeCount += 1;
		else {
			unavailable.push({
				id: node._id.$oid,
				state: data.state,
				documentId: data.id,
				...(data.message ? { message: data.message } : {}),
			});
		}
	}

	const edgesMissingLabels: EdgeIssue[] = [];
	const edgesWithUnknownNodes: EdgeIssue[] = [];
	for (const edge of edges) {
		const from = edge.fromNode.$oid;
		const to = edge.toNode.$oid;
		const issue: EdgeIssue = { id: edge._id.$oid, from, to };
		if (!edge.label?.trim()) edgesMissingLabels.push(issue);
		const unknown: Array<"from" | "to"> = [];
		if (!knownNodeIds.has(from)) unknown.push("from");
		if (!knownNodeIds.has(to)) unknown.push("to");
		if (unknown.length) edgesWithUnknownNodes.push({ ...issue, unknown });
	}

	return {
		kind: "Canvas",
		id: document._id.$oid,
		title: document.title ?? "Untitled",
		nodeCount: nodes.length,
		documentNodeCount,
		groupNodeCount,
		edgeCount: edges.length,
		unavailable,
		edgesMissingLabels,
		edgesWithUnknownNodes,
	};
}

function verifyBundle(document: DocumentView): StructureReport {
	const bundle = bundleDocumentSchema.parse(document);
	const members = bundle.content._content.documentsMetadata;
	const unavailable: UnavailableEntry[] = [];
	for (const member of members) {
		if (member._type === "Authorized") continue;
		if (member._type === "Error") {
			unavailable.push({
				id: member._content.documentId.$oid,
				state: "Error",
				message: member._content.message,
			});
		} else {
			unavailable.push({ id: member._content.$oid, state: member._type });
		}
	}
	return {
		kind: "Bundle",
		id: bundle._id.$oid,
		title: bundle.title ?? "Untitled",
		memberCount: members.length,
		availableCount: members.length - unavailable.length,
		unavailable,
	};
}

/** Pure read-back check of a Bundle or Canvas document; never writes. */
export function verifyDocumentStructure(
	document: DocumentView,
): StructureReport {
	if (document.content._type === "Canvas") {
		return verifyCanvas(document, document.content);
	}
	if (document.content._type === "Bundle") {
		return verifyBundle(document);
	}
	return {
		kind: document.content._type,
		id: document._id.$oid,
		title: document.title ?? "Untitled",
		verifiable: false,
	};
}

function describeUnavailable(entry: UnavailableEntry): string {
	const parts = [`- ${entry.id}: ${entry.state}`];
	if (entry.documentId && entry.documentId !== entry.id)
		parts.push(`(document ${entry.documentId})`);
	if (entry.message) parts.push(`— ${entry.message}`);
	return parts.join(" ");
}

export function formatStructureReport(report: StructureReport): string {
	const lines = [
		`Kind: ${report.kind}`,
		`ID: ${report.id}`,
		`Title: ${report.title}`,
	];

	if ("verifiable" in report) {
		lines.push("Not a Bundle or Canvas — nothing to verify.");
		return lines.join("\n");
	}

	if (report.kind === "Bundle") {
		lines.push(
			`Members: ${report.memberCount} (available: ${report.availableCount}, unavailable: ${report.unavailable.length})`,
		);
		if (report.unavailable.length) {
			lines.push("", "Unavailable members:");
			lines.push(...report.unavailable.map(describeUnavailable));
		}
		lines.push(
			"",
			report.unavailable.length === 0
				? "OK: all members are readable."
				: `Issues: ${report.unavailable.length}`,
		);
		return lines.join("\n");
	}

	lines.push(
		`Nodes: ${report.nodeCount} (documents: ${report.documentNodeCount}, groups: ${report.groupNodeCount}, unavailable: ${report.unavailable.length})`,
		`Edges: ${report.edgeCount}`,
	);
	if (report.unavailable.length) {
		lines.push("", "Unavailable nodes:");
		lines.push(...report.unavailable.map(describeUnavailable));
	}
	if (report.edgesMissingLabels.length) {
		lines.push("", "Advisory: edges missing optional labels:");
		lines.push(
			...report.edgesMissingLabels.map((e) => `- ${e.id}: ${e.from} → ${e.to}`),
		);
	}
	if (report.edgesWithUnknownNodes.length) {
		lines.push("", "Edges referencing unknown node ids:");
		lines.push(
			...report.edgesWithUnknownNodes.map(
				(e) =>
					`- ${e.id}: ${e.from} → ${e.to} (unknown: ${(e.unknown ?? []).join(", ")})`,
			),
		);
	}
	const issueCount =
		report.unavailable.length + report.edgesWithUnknownNodes.length;
	lines.push(
		"",
		issueCount === 0
			? "OK: all nodes readable and all edge endpoints resolvable."
			: `Issues: ${issueCount}`,
	);
	return lines.join("\n");
}
