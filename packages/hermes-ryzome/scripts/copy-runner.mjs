import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(packageRoot, "dist", "runner.js");
const target = path.join(packageRoot, "ryzome_hermes_plugin", "_runner.js");

if (!existsSync(source)) {
	console.error(`copy-runner: missing ${source}. Run \`tsc\` before this script.`);
	process.exit(1);
}

cpSync(source, target);
console.log(`copy-runner: bundled ${path.relative(packageRoot, target)}`);
