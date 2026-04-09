/**
 * Syncs the version from packages/openclaw-ryzome/package.json into
 * packages/openclaw-ryzome/openclaw.plugin.json.
 *
 * Called after `changeset version` so the plugin manifest stays in sync
 * and the diff is visible in the "Version Packages" PR.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = path.join(root, "packages/openclaw-ryzome/package.json");
const pluginPath = path.join(root, "packages/openclaw-ryzome/openclaw.plugin.json");

const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
const plugin = JSON.parse(await readFile(pluginPath, "utf8"));

if (plugin.version !== pkg.version) {
  plugin.version = pkg.version;
  await writeFile(pluginPath, `${JSON.stringify(plugin, null, "\t")}\n`, "utf8");
  console.log(`openclaw.plugin.json synced to ${pkg.version}`);
} else {
  console.log(`openclaw.plugin.json already at ${pkg.version}`);
}
