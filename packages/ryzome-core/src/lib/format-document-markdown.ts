import { buildDocumentViewAppUrl } from "./app-url.js";
import type { DocumentView } from "./client/index.js";
import { formatCanvasAsMarkdown } from "./format-canvas-markdown.js";

function formatFileDetails(document: DocumentView): string[] {
	if (document.content._type !== "File") return [];

	if (document.content._content._type === "s3Object") {
		const file = document.content._content;
		return [
			`File type: ${file.file_type}`,
			`Storage: s3Object`,
			`Key: ${file.key}`,
			...(file.download_url ? [`Download: ${file.download_url}`] : []),
		];
	}

	return [
		`File type: ${document.content._content.file_type}`,
		"Storage: googleDriveObject",
		`Drive ID: ${document.content._content.id}`,
	];
}

export function formatDocumentAsMarkdown(
	document: DocumentView,
	opts?: { appUrl?: string },
): string {
	if (document.content._type === "Canvas") {
		return formatCanvasAsMarkdown(
			{
				_id: document._id,
				name: document.title ?? "Untitled",
				description: document.description,
				nodes: document.content._content.nodes,
				edges: document.content._content.edges,
				isTemplate: false,
				ownerId: document.ownerId,
			},
			{ appUrl: opts?.appUrl },
		);
	}

	const lines: string[] = [];

	lines.push(`# ${document.title ?? "Untitled"}`);

	if (document.description) {
		lines.push("", document.description);
	}

	lines.push("", `> Type: ${document.content._type}`);

	if (opts?.appUrl) {
		lines.push(
			"",
			`> View: ${buildDocumentViewAppUrl(opts.appUrl, document)}`,
		);
	}

	if (document.tags?.length) {
		lines.push("", `> Tags: ${document.tags.join(", ")}`);
	}

	switch (document.content._type) {
		case "Text": {
			const text = document.content._content.text ?? "";
			if (text) {
				lines.push("", text);
			}

			if (document.content._content.agentConfig?.prompt) {
				lines.push(
					"",
					"## Prompt",
					"",
					document.content._content.agentConfig.prompt,
				);
			}
			break;
		}
		case "Website":
			lines.push("", `URL: ${document.content._content.url}`);
			break;
		case "Youtube":
			lines.push(
				"",
				`Video ID: ${document.content._content.videoId}`,
				`Watch: https://www.youtube.com/watch?v=${document.content._content.videoId}`,
			);
			break;
		case "File":
			lines.push("", ...formatFileDetails(document));
			break;
	}

	return lines.join("\n");
}
