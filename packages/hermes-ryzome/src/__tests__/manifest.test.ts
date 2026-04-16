import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toolRegistry } from "@ryzome-ai/ryzome-core";
import { z } from "zod";
import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(
	packageRoot,
	"ryzome_hermes_plugin",
	"tool_manifest.json",
);
const pluginYamlPath = path.join(packageRoot, "plugin.yaml");
const packagedPluginYamlPath = path.join(
	packageRoot,
	"ryzome_hermes_plugin",
	"plugin.yaml",
);

function readProvidesTools(): string[] {
	const lines = fs.readFileSync(pluginYamlPath, "utf8").split("\n");
	const collected: string[] = [];
	let inSection = false;

	for (const line of lines) {
		if (line.startsWith("provides_tools:")) {
			inSection = true;
			continue;
		}
		if (inSection && !line.startsWith("  - ")) {
			break;
		}
		if (inSection) {
			collected.push(line.replace("  - ", "").trim());
		}
	}

	return collected;
}

describe("Hermes manifest parity", () => {
	it("keeps the generated tool manifest aligned with toolRegistry", () => {
		const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Array<{
			name: string;
			description: string;
			parameters: unknown;
		}>;

		expect(manifest.map((entry) => entry.name)).toEqual(
			toolRegistry.map((tool) => tool.name),
		);
		expect(
			manifest.map((entry) => ({
				name: entry.name,
				description: entry.description,
			})),
		).toEqual(
			toolRegistry.map((tool) => ({
				name: tool.name,
				description: tool.description,
			})),
		);
		expect(manifest.map((entry) => entry.parameters)).toEqual(
			toolRegistry.map((tool) => z.toJSONSchema(tool.paramsSchema)),
		);
	});

	it("keeps plugin.yaml provides_tools aligned with toolRegistry", () => {
		expect(readProvidesTools()).toEqual(toolRegistry.map((tool) => tool.name));
	});

	it("keeps the root and packaged plugin.yaml byte-identical", () => {
		const rootContents = fs.readFileSync(pluginYamlPath, "utf8");
		const packagedContents = fs.readFileSync(packagedPluginYamlPath, "utf8");
		expect(packagedContents).toEqual(rootContents);
	});
});
