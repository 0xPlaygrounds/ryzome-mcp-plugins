/**
 * Syncs the version from packages/hermes-ryzome/package.json into the
 * Hermes plugin metadata files.
 *
 * Called after `changeset version` so the Python plugin metadata stays in sync
 * and the diff is visible in the "Version Packages" PR.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(root, "packages/hermes-ryzome");
const pkgPath = path.join(packageRoot, "package.json");
const rootPluginPath = path.join(packageRoot, "plugin.yaml");
const packagePluginPath = path.join(
	packageRoot,
	"ryzome_hermes_plugin/plugin.yaml",
);
const pyprojectPath = path.join(packageRoot, "pyproject.toml");
const initPath = path.join(packageRoot, "ryzome_hermes_plugin/__init__.py");

const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
const version = pkg.version;

const replacements = [
	{
		path: rootPluginPath,
		pattern: /^version: .+$/m,
		replacement: `version: ${version}`,
	},
	{
		path: packagePluginPath,
		pattern: /^version: .+$/m,
		replacement: `version: ${version}`,
	},
	{
		path: pyprojectPath,
		pattern: /^version = ".+"$/m,
		replacement: `version = "${version}"`,
	},
	{
		path: initPath,
		pattern: /^__version__ = ".+"$/m,
		replacement: `__version__ = "${version}"`,
	},
];

let changedCount = 0;

for (const entry of replacements) {
	const current = await readFile(entry.path, "utf8");
	const next = current.replace(entry.pattern, entry.replacement);
	if (next !== current) {
		await writeFile(entry.path, next, "utf8");
		changedCount += 1;
	}
}

if (changedCount > 0) {
	console.log(`Hermes plugin metadata synced to ${version}`);
} else {
	console.log(`Hermes plugin metadata already at ${version}`);
}
