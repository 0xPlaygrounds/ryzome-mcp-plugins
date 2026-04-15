import { afterEach, describe, expect, it, vi } from "vitest";
import { RyzomeClient } from "../../lib/ryzome-client.js";
import { executeListDocuments } from "../list-documents.js";

const clientConfig = {
	apiKey: "secret-key",
	apiUrl: "https://api.ryzome.ai",
	appUrl: "https://ryzome.ai",
};

describe("executeListDocuments", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns formatted standalone document summaries", async () => {
		vi.spyOn(RyzomeClient.prototype, "listDocuments").mockResolvedValue({
			data: [
				{
					_id: { $oid: "doc123" },
					title: "Spec",
					description: "Working draft",
					content: {
						_type: "Text",
						_content: { text: "Hello world" },
					},
					generated: false,
					inLibrary: true,
					isFavorite: false,
					ownerId: "owner1",
					tags: ["draft"],
					createdAt: "2026-01-01T00:00:00Z",
					updatedAt: "2026-01-01T00:00:00Z",
				},
			],
		});

		const result = await executeListDocuments({}, clientConfig);
		const parsed = JSON.parse(result.content[0].text);

		expect(parsed.count).toBe(1);
		expect(parsed.documents[0]).toMatchObject({
			id: "doc123",
			contentType: "Text",
			inLibrary: true,
			url: "https://ryzome.ai/workspace?document=doc123",
		});
	});

	it("defaults to library-only listing", async () => {
		const spy = vi
			.spyOn(RyzomeClient.prototype, "listDocuments")
			.mockResolvedValue({ data: [] });

		await executeListDocuments({}, clientConfig);

		expect(spy).toHaveBeenCalledWith({
			tag: undefined,
			favorite: undefined,
			inLibraryOnly: true,
			contentTypes: undefined,
		});
	});
});
