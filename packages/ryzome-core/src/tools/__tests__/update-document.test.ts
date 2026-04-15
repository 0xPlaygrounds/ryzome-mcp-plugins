import { afterEach, describe, expect, it, vi } from "vitest";
import { RyzomeClient } from "../../lib/ryzome-client.js";
import { executeUpdateDocument } from "../update-document.js";

const clientConfig = {
	apiKey: "secret-key",
	apiUrl: "https://api.ryzome.ai",
	appUrl: "https://ryzome.ai",
};

describe("executeUpdateDocument", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("applies document operations and metadata updates", async () => {
		const patchSpy = vi
			.spyOn(RyzomeClient.prototype, "patchDocument")
			.mockResolvedValue(undefined);
		const metadataSpy = vi
			.spyOn(RyzomeClient.prototype, "updateDocumentMetadata")
			.mockResolvedValue({ updated: true });
		vi.spyOn(RyzomeClient.prototype, "getDocument").mockResolvedValue({
			_id: { $oid: "doc123" },
			title: "Updated spec",
			description: "Working draft",
			content: {
				_type: "Text",
				_content: { text: "Hello world" },
			},
			generated: false,
			inLibrary: true,
			isFavorite: true,
			ownerId: "owner1",
			tags: ["draft"],
			createdAt: "2026-01-01T00:00:00Z",
			updatedAt: "2026-01-01T00:00:00Z",
		} as never);

		const result = await executeUpdateDocument(
			{
				document_id: "doc123",
				title: "Updated spec",
				favorite: true,
				description: "Working draft",
				in_library: true,
			},
			clientConfig,
		);

		expect(patchSpy).toHaveBeenCalledWith("doc123", {
			operations: [
				{ _type: "setTitle", title: "Updated spec" },
				{ _type: "setFavoriteState", isFavorite: true },
			],
		});
		expect(metadataSpy).toHaveBeenCalledWith("doc123", {
			description: "Working draft",
			inLibrary: true,
		});
		expect(result.content[0].text).toContain("Document updated: **Updated spec**");
	});

	it("rejects empty updates", async () => {
		await expect(
			executeUpdateDocument({ document_id: "doc123" }, clientConfig),
		).rejects.toThrow("No document updates provided.");
	});
});
