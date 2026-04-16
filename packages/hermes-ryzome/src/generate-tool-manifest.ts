import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toolRegistry } from "@ryzome-ai/ryzome-core";
import { z } from "zod";

export function generateToolManifest() {
	return toolRegistry.map((tool) => ({
		name: tool.name,
		description: tool.description,
		parameters: z.toJSONSchema(tool.paramsSchema),
	}));
}

async function main() {
	const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	const manifestPath = path.join(
		packageRoot,
		"ryzome_hermes_plugin",
		"tool_manifest.json",
	);

	await mkdir(path.dirname(manifestPath), { recursive: true });
	await writeFile(
		manifestPath,
		JSON.stringify(generateToolManifest(), null, 2) + "\n",
		"utf8",
	);

	console.log(`Wrote ${toolRegistry.length} tool schemas to ${manifestPath}`);
}

const isEntrypoint =
	process.argv[1] != null &&
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
	void main();
}
