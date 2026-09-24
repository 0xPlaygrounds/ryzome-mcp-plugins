import type { components } from "./schema";

type NodeEditorView = components["schemas"]["NodeEditorView"];

/** Node data as served since RYZ-2397: access state wrapper around the node payload. */
export type NodeDataAccessView = NodeEditorView["data"];

export type NodeDocumentData = Extract<
	Extract<NodeDataAccessView, { _type: "Authorized" }>["_content"],
	{ _type: "Document" }
>;
export type NodeGroupData = Extract<
	Extract<NodeDataAccessView, { _type: "Authorized" }>["_content"],
	{ _type: "Group" }
>;

/** Pre-RYZ-2397 flat shape, kept so older payloads still render. */
export type LegacyNodeData =
	| ({ _type: "Document" } & Omit<NodeDocumentData, "_type">)
	| ({ _type: "Group" } & Omit<NodeGroupData, "_type">);

export type UnavailableNodeState = "NotFound" | "Unauthorized" | "Error";

export type UnwrappedNodeData =
	| { kind: "document"; document: NodeDocumentData }
	| { kind: "group"; title: string | null }
	| {
			kind: "unavailable";
			state: UnavailableNodeState;
			id: string | null;
			message?: string;
	  };

function unwrapAuthorized(
	content: NodeDocumentData | NodeGroupData,
): UnwrappedNodeData {
	if (content._type === "Document") {
		return { kind: "document", document: content };
	}
	return { kind: "group", title: content.title ?? null };
}

/**
 * Normalize a canvas node's `data` into a small discriminated union.
 *
 * Accepts the current access-state wrapper
 * (`{ _type: "Authorized" | "NotFound" | "Unauthorized" | "Error", _content }`)
 * as well as the legacy flat `{ _type: "Document" | "Group", ... }` shape.
 */
export function unwrapNodeData(
	data: NodeDataAccessView | LegacyNodeData | null | undefined,
): UnwrappedNodeData {
	if (!data) {
		return { kind: "unavailable", state: "Error", id: null };
	}

	switch (data._type) {
		case "Authorized":
			return unwrapAuthorized(data._content);
		case "NotFound":
		case "Unauthorized":
			return {
				kind: "unavailable",
				state: data._type,
				id: data._content.$oid,
			};
		case "Error":
			return {
				kind: "unavailable",
				state: "Error",
				id: data._content.documentId.$oid,
				message: data._content.message,
			};
		case "Document":
		case "Group":
			return unwrapAuthorized(data);
		default:
			return { kind: "unavailable", state: "Error", id: null };
	}
}

/** Human-readable placeholder for a node whose document could not be resolved. */
export function describeUnavailableNode(
	node: Extract<UnwrappedNodeData, { kind: "unavailable" }>,
): string {
	return `(unavailable: ${node.state})`;
}
