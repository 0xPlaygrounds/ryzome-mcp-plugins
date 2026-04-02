import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFilePath), "..");
const packageJsonPath = path.join(rootDir, "package.json");
const pluginJsonPath = path.join(rootDir, "openclaw.plugin.json");

function parseArgs(argv) {
	const args = {};

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];

		if (!token.startsWith("--")) {
			continue;
		}

		const key = token.slice(2);
		const next = argv[index + 1];

		if (!next || next.startsWith("--")) {
			args[key] = true;
			continue;
		}

		args[key] = next;
		index += 1;
	}

	return args;
}

function parseStableVersion(version) {
	const match = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?:[-+].+)?$/.exec(
		version,
	);

	if (!match?.groups) {
		throw new Error(`Unsupported semver version: ${version}`);
	}

	return {
		major: Number.parseInt(match.groups.major, 10),
		minor: Number.parseInt(match.groups.minor, 10),
		patch: Number.parseInt(match.groups.patch, 10),
	};
}

function getNextDevVersion(currentVersion, runNumber, runAttempt) {
	const stable = parseStableVersion(currentVersion);
	const nextPatch = stable.patch + 1;

	return `${stable.major}.${stable.minor}.${nextPatch}-dev.${runNumber}.${runAttempt}`;
}

function normalizeStableTag(tag) {
	const match = /^v(?<version>\d+\.\d+\.\d+)$/.exec(tag);

	if (!match?.groups?.version) {
		throw new Error(
			`Stable release tag must match v<major>.<minor>.<patch>, received: ${tag}`,
		);
	}

	return match.groups.version;
}

async function readJson(filePath) {
	const content = await readFile(filePath, "utf8");
	return JSON.parse(content);
}

async function writeJson(filePath, value) {
	const content = `${JSON.stringify(value, null, 2)}\n`;
	await writeFile(filePath, content, "utf8");
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const mode = args.mode;

	if (mode !== "dev" && mode !== "stable") {
		throw new Error('Expected --mode to be "dev" or "stable"');
	}

	const packageJson = await readJson(packageJsonPath);
	const pluginJson = await readJson(pluginJsonPath);

	if (packageJson.version !== pluginJson.version) {
		console.warn(
			`Version mismatch detected before publish: package.json=${packageJson.version}, openclaw.plugin.json=${pluginJson.version}`,
		);
	}

	let nextVersion;

	if (mode === "dev") {
		const runNumber = args["run-number"];
		const runAttempt = args["run-attempt"] ?? "1";

		if (!/^\d+$/.test(String(runNumber))) {
			throw new Error("Dev mode requires --run-number to be a numeric value");
		}

		if (!/^\d+$/.test(String(runAttempt))) {
			throw new Error("--run-attempt must be a numeric value");
		}

		nextVersion = getNextDevVersion(packageJson.version, runNumber, runAttempt);
	} else {
		const releaseTag = args.tag;

		if (typeof releaseTag !== "string") {
			throw new Error("Stable mode requires --tag v<major>.<minor>.<patch>");
		}

		nextVersion = normalizeStableTag(releaseTag);
	}

	packageJson.version = nextVersion;
	pluginJson.version = nextVersion;

	await writeJson(packageJsonPath, packageJson);
	await writeJson(pluginJsonPath, pluginJson);

	console.log(nextVersion);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
