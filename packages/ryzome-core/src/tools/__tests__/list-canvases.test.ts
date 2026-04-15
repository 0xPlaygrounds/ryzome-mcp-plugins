import { afterEach, describe, expect, it, vi } from "vitest";
import { RyzomeClient } from "../../lib/ryzome-client.js";
import { executeListCanvases } from "../list-canvases.js";

const clientConfig = {
	apiKey: "secret-key",
	apiUrl: "https://api.ryzome.ai",
	appUrl: "https://ryzome.ai",
};

const mockCanvases = [
	{
		_id: { $oid: "aaa111" },
		name: "Research Canvas",
		description: "AI research notes",
		isTemplate: false,
		pinned: true,
		updatedAt: "2026-03-28T12:00:00Z",
	},
	{
		_id: { $oid: "bbb222" },
		name: "Plan Canvas",
		description: null,
		isTemplate: false,
		pinned: false,
		updatedAt: "2026-03-27T08:00:00Z",
	},
];

describe("executeListCanvases", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should return formatted canvas summaries", async () => {
		vi.spyOn(RyzomeClient.prototype, "listCanvases").mockResolvedValue({
			data: mockCanvases,
		});

		const result = await executeListCanvases({}, clientConfig);
		const parsed = JSON.parse(result.content[0].text);

		expect(parsed.count).toBe(2);
		expect(parsed.canvases[0]).toMatchObject({
			id: "aaa111",
			name: "Research Canvas",
			description: "AI research notes",
			pinned: true,
			url: "https://ryzome.ai/workspace?canvas=aaa111",
		});
		expect(parsed.canvases[1]).toMatchObject({
			id: "bbb222",
			name: "Plan Canvas",
			description: null,
			pinned: false,
		});
	});

	it("should pass pinned filter to the client", async () => {
		const spy = vi
			.spyOn(RyzomeClient.prototype, "listCanvases")
			.mockResolvedValue({ data: [] });

		await executeListCanvases({ pinned: true }, clientConfig);

		expect(spy).toHaveBeenCalledWith({ pinned: true });
	});

	it("should handle empty results", async () => {
		vi.spyOn(RyzomeClient.prototype, "listCanvases").mockResolvedValue({
			data: [],
		});

		const result = await executeListCanvases({}, clientConfig);
		const parsed = JSON.parse(result.content[0].text);

		expect(parsed.count).toBe(0);
		expect(parsed.canvases).toEqual([]);
	});

	it("should strip trailing slashes from appUrl", async () => {
		vi.spyOn(RyzomeClient.prototype, "listCanvases").mockResolvedValue({
			data: mockCanvases.slice(0, 1),
		});

		const result = await executeListCanvases(
			{},
			{ ...clientConfig, appUrl: "https://ryzome.ai/" },
		);
		const parsed = JSON.parse(result.content[0].text);

		expect(parsed.canvases[0].url).toBe(
			"https://ryzome.ai/workspace?canvas=aaa111",
		);
	});
});
