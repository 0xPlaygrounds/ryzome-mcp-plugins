import { describe, expect, it } from "vitest";
import {
	describeUnavailableNode,
	unwrapNodeData,
} from "../client/node-data.js";

const documentPayload = {
	_type: "Document" as const,
	_id: { $oid: "doc1" },
	ownerId: "owner1",
	title: "Spec",
	content: { _type: "Text" as const, _content: { text: "Hello" } },
	generated: false,
	inLibrary: false,
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

describe("unwrapNodeData", () => {
	it("unwraps an Authorized document (RYZ-2397 wrapped shape)", () => {
		const result = unwrapNodeData({
			_type: "Authorized",
			_content: documentPayload,
		});
		expect(result.kind).toBe("document");
		if (result.kind === "document") {
			expect(result.document._id.$oid).toBe("doc1");
			expect(result.document.title).toBe("Spec");
		}
	});

	it("unwraps an Authorized group", () => {
		expect(
			unwrapNodeData({
				_type: "Authorized",
				_content: { _type: "Group", title: "Phase 1" },
			}),
		).toEqual({ kind: "group", title: "Phase 1" });
		expect(
			unwrapNodeData({ _type: "Authorized", _content: { _type: "Group" } }),
		).toEqual({ kind: "group", title: null });
	});

	it("maps NotFound and Unauthorized to unavailable with the document id", () => {
		expect(
			unwrapNodeData({ _type: "NotFound", _content: { $oid: "missing" } }),
		).toEqual({ kind: "unavailable", state: "NotFound", id: "missing" });
		expect(
			unwrapNodeData({ _type: "Unauthorized", _content: { $oid: "secret" } }),
		).toEqual({ kind: "unavailable", state: "Unauthorized", id: "secret" });
	});

	it("maps Error to unavailable with id and message", () => {
		expect(
			unwrapNodeData({
				_type: "Error",
				_content: { documentId: { $oid: "broken" }, message: "boom" },
			}),
		).toEqual({
			kind: "unavailable",
			state: "Error",
			id: "broken",
			message: "boom",
		});
	});

	it("still accepts the legacy flat Document / Group shapes", () => {
		const legacyDoc = unwrapNodeData(documentPayload);
		expect(legacyDoc.kind).toBe("document");
		expect(unwrapNodeData({ _type: "Group", title: "Old" })).toEqual({
			kind: "group",
			title: "Old",
		});
	});

	it("treats missing or unknown data as an Error state", () => {
		expect(unwrapNodeData(undefined)).toEqual({
			kind: "unavailable",
			state: "Error",
			id: null,
		});
		expect(unwrapNodeData({ _type: "Mystery" } as never)).toMatchObject({
			kind: "unavailable",
			state: "Error",
		});
	});

	it("describes unavailable nodes with their access state", () => {
		expect(
			describeUnavailableNode({
				kind: "unavailable",
				state: "Unauthorized",
				id: "x",
			}),
		).toBe("(unavailable: Unauthorized)");
	});
});
