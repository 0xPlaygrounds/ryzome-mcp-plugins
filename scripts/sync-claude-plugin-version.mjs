/**
 * Syncs the version from packages/ryzome-claude-plugin/package.json into
 * packages/ryzome-claude-plugin/.claude-plugin/plugin.json and into the
 * matching plugin entry of the root .claude-plugin/marketplace.json.
 *
 * Called after `changeset version` so the Claude Code plugin manifest and
 * the marketplace descriptor stay in lockstep with the npm package version.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = path.join(root, "packages/ryzome-claude-plugin/package.json");
const pluginPath = path.join(
	root,
	"packages/ryzome-claude-plugin/.claude-plugin/plugin.json",
);
const marketplacePath = path.join(root, ".claude-plugin/marketplace.json");

const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
const plugin = JSON.parse(await readFile(pluginPath, "utf8"));

if (plugin.version !== pkg.version) {
	plugin.version = pkg.version;
	await writeFile(
		pluginPath,
		`${JSON.stringify(plugin, null, "\t")}\n`,
		"utf8",
	);
	console.log(`ryzome-claude-plugin plugin.json synced to ${pkg.version}`);
} else {
	console.log(`ryzome-claude-plugin plugin.json already at ${pkg.version}`);
}

const marketplace = JSON.parse(await readFile(marketplacePath, "utf8"));
const entry = marketplace.plugins?.find((p) => p.name === "claude-ryzome");
if (!entry) {
	throw new Error(
		`marketplace.json has no plugin entry named "claude-ryzome" — cannot sync version`,
	);
}
if (entry.version !== pkg.version) {
	entry.version = pkg.version;
	await writeFile(
		marketplacePath,
		`${JSON.stringify(marketplace, null, "\t")}\n`,
		"utf8",
	);
	console.log(`marketplace.json "claude-ryzome" entry synced to ${pkg.version}`);
} else {
	console.log(`marketplace.json "claude-ryzome" entry already at ${pkg.version}`);
}
