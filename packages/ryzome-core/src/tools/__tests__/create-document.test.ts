import { afterEach, describe, expect, it, vi } from "vitest";
import { RyzomeClient } from "../../lib/ryzome-client.js";
import { executeCreateDocument } from "../create-document.js";

const clientConfig = {
	apiKey: "secret-key",
	apiUrl: "https://api.ryzome.ai",
	appUrl: "https://ryzome.ai",
};

describe("executeCreateDocument", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("creates a standalone text document", async () => {
		vi.spyOn(RyzomeClient.prototype, "createDocument").mockResolvedValue({
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
		} as never);

		const result = await executeCreateDocument(
			{
				title: "Spec",
				content: {
					_type: "Text",
					_content: { text: "Hello world" },
				},
			},
			clientConfig,
		);

		expect(result.content[0].text).toContain("Document created: **Spec**");
		expect(result.content[0].text).toContain(
			"https://ryzome.ai/workspace?document=doc123",
		);
	});
});
