import { afterEach, describe, expect, it, vi } from "vitest";
import { RyzomeClient } from "../../lib/ryzome-client.js";
import { executeSaveNodeToLibrary } from "../save-node-to-library.js";

const clientConfig = {
	apiKey: "secret-key",
	apiUrl: "https://api.ryzome.ai",
	appUrl: "https://ryzome.ai",
};

describe("executeSaveNodeToLibrary", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("promotes a node-backed document into the library", async () => {
		vi.spyOn(RyzomeClient.prototype, "getCanvas").mockResolvedValue({
			_id: { $oid: "canvas123" },
			name: "Research canvas",
			description: null,
			isTemplate: false,
			ownerId: "owner1",
			nodes: [
				{
					_id: { $oid: "node123" },
					color: "#ffffff",
					createdAt: "2026-01-01T00:00:00Z",
					updatedAt: "2026-01-01T00:00:00Z",
					height: 200,
					width: 320,
					x: 0,
					y: 0,
					data: {
						_type: "Document",
						_id: { $oid: "doc123" },
						title: "Spec",
						description: null,
						content: {
							_type: "Text",
							_content: { text: "Hello world" },
						},
						generated: false,
						inLibrary: false,
						isFavorite: false,
						ownerId: "owner1",
						tags: [],
						createdAt: "2026-01-01T00:00:00Z",
						updatedAt: "2026-01-01T00:00:00Z",
					},
				},
			],
			edges: [],
		} as never);
		const metadataSpy = vi
			.spyOn(RyzomeClient.prototype, "updateDocumentMetadata")
			.mockResolvedValue({ updated: true });

		const result = await executeSaveNodeToLibrary(
			{
				canvas_id: "canvas123",
				node_id: "node123",
			},
			clientConfig,
		);

		expect(metadataSpy).toHaveBeenCalledWith("doc123", { inLibrary: true });
		expect(result.content[0].text).toContain(
			"https://ryzome.ai/workspace?document=doc123",
		);
	});
});
