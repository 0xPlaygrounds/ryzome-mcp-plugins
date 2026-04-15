import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import {
	createServer,
	type IncomingMessage,
	type Server,
	type ServerResponse,
} from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

type OpenClawConfig = {
	plugins?: {
		entries?: Record<
			string,
			{ enabled?: boolean; config?: Record<string, unknown> } | undefined
		>;
		installs?: Record<string, unknown>;
	};
};

type AgentToolResult = {
	content?: Array<{ type: string; text?: string }>;
};

type RegisteredTool = {
	name: string;
	description: string;
	parameters: unknown;
	execute: (
		id: string,
		params: Record<string, unknown>,
	) => Promise<AgentToolResult>;
};

type StubRequest = {
	method: string;
	url: string;
	apiKey: string | null;
	body: unknown;
};

const pluginRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);
const coreRoot = path.resolve(pluginRoot, "..", "ryzome-core");
const openclawRoot = path.join(pluginRoot, "node_modules", "openclaw");
const openclawCliPath = path.join(openclawRoot, "openclaw.mjs");
const liveSmokeEnabled = process.env.RYZOME_ENABLE_LIVE_SMOKE === "1";
const liveSmokeApiKey = process.env.RYZOME_LIVE_SMOKE_API_KEY?.trim();
const liveSmokeApiUrl = process.env.RYZOME_LIVE_SMOKE_API_URL?.trim();
const liveSmokeAppUrl = process.env.RYZOME_LIVE_SMOKE_APP_URL?.trim();

const tempRoots = new Set<string>();

function getPnpmCommand() {
	return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function runOpenClaw(args: string[], stateDir: string): string {
	const configPath = path.join(stateDir, "openclaw.json");
	return execFileSync(process.execPath, [openclawCliPath, ...args], {
		cwd: pluginRoot,
		encoding: "utf8",
		env: {
			...process.env,
			NO_COLOR: "1",
			OPENCLAW_CONFIG_PATH: configPath,
			OPENCLAW_STATE_DIR: stateDir,
			OPENCLAW_TEST_FAST: "1",
		},
	});
}

async function createTempRoot(prefix: string) {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
	tempRoots.add(dir);
	return dir;
}

async function packPluginTarball(tempDir: string) {
	execFileSync(getPnpmCommand(), ["pack", "--pack-destination", tempDir], {
		cwd: pluginRoot,
		encoding: "utf8",
	});
	const entries = await fs.readdir(tempDir);
	const tarball = entries.find((entry) => entry.endsWith(".tgz"));
	if (!tarball) {
		throw new Error(`No packed tarball found in ${tempDir}`);
	}
	return path.join(tempDir, tarball);
}

async function readConfig(stateDir: string): Promise<OpenClawConfig> {
	const configPath = path.join(stateDir, "openclaw.json");
	const raw = await fs.readFile(configPath, "utf8");
	return JSON.parse(raw) as OpenClawConfig;
}

async function setPluginConfig(
	stateDir: string,
	params: { apiKey: string; apiUrl: string; appUrl: string },
) {
	runOpenClaw(
		[
			"config",
			"set",
			"plugins.entries.openclaw-ryzome.config.apiKey",
			JSON.stringify(params.apiKey),
			"--strict-json",
		],
		stateDir,
	);
	runOpenClaw(
		[
			"config",
			"set",
			"plugins.entries.openclaw-ryzome.config.apiUrl",
			JSON.stringify(params.apiUrl),
			"--strict-json",
		],
		stateDir,
	);
	runOpenClaw(
		[
			"config",
			"set",
			"plugins.entries.openclaw-ryzome.config.appUrl",
			JSON.stringify(params.appUrl),
			"--strict-json",
		],
		stateDir,
	);
}

async function withStateDirEnv<T>(stateDir: string, fn: () => Promise<T> | T) {
	const previousStateDir = process.env.OPENCLAW_STATE_DIR;
	const previousConfigPath = process.env.OPENCLAW_CONFIG_PATH;
	const previousTestFast = process.env.OPENCLAW_TEST_FAST;
	process.env.OPENCLAW_STATE_DIR = stateDir;
	process.env.OPENCLAW_CONFIG_PATH = path.join(stateDir, "openclaw.json");
	process.env.OPENCLAW_TEST_FAST = "1";
	try {
		return await fn();
	} finally {
		if (previousStateDir === undefined) {
			delete process.env.OPENCLAW_STATE_DIR;
		} else {
			process.env.OPENCLAW_STATE_DIR = previousStateDir;
		}
		if (previousConfigPath === undefined) {
			delete process.env.OPENCLAW_CONFIG_PATH;
		} else {
			process.env.OPENCLAW_CONFIG_PATH = previousConfigPath;
		}
		if (previousTestFast === undefined) {
			delete process.env.OPENCLAW_TEST_FAST;
		} else {
			process.env.OPENCLAW_TEST_FAST = previousTestFast;
		}
	}
}

async function executeCreateCanvasTool(
	stateDir: string,
	config: OpenClawConfig,
	title: string,
) {
	const installedPluginRoot = path.join(
		stateDir,
		"extensions",
		"openclaw-ryzome",
	);
	const installedEntry = path.join(installedPluginRoot, "src", "index.ts");
	const pluginModule = await withStateDirEnv(
		stateDir,
		async () => await import(pathToFileURL(installedEntry).href),
	);
	const tools: RegisteredTool[] = [];
	const cliRegistrars: Array<(context: { program: unknown }) => void> = [];
	const logger = {
		info: (_message: string) => {},
		warn: (_message: string) => {},
		error: (_message: string) => {},
	};

	await pluginModule.default({
		pluginConfig: config.plugins?.entries?.["openclaw-ryzome"]?.config ?? {},
		runtime: {
			config: {
				loadConfig: () => config,
				writeConfigFile: async () => {},
			},
		},
		logger,
		registerCli: (registrar: (context: { program: unknown }) => void) => {
			cliRegistrars.push(registrar);
		},
		registerTool: (tool: RegisteredTool) => {
			tools.push(tool);
		},
	});

	expect(cliRegistrars.length).toBeGreaterThan(0);

	const tool = tools.find((entry) => entry.name === "create_ryzome_canvas");
	expect(tool).toBeDefined();

	return await tool?.execute("integration-call", {
		title,
		nodes: [
			{
				id: "discover",
				title: "Discover",
				description: "Inspect the current context",
			},
			{
				id: "plan",
				title: "Plan",
				description: "Connect the current context to the next step",
			},
		],
		edges: [{ from: "discover", to: "plan", label: "feeds" }],
	});
}

async function readJsonBody(req: IncomingMessage) {
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	const raw = Buffer.concat(chunks).toString("utf8");
	return raw ? (JSON.parse(raw) as unknown) : undefined;
}

function isCanvasCreateRequest(body: unknown): boolean {
	if (typeof body !== "object" || body === null) return false;
	const documents = (body as { documents?: unknown }).documents;
	if (!Array.isArray(documents) || documents.length === 0) return false;
	const firstDocument = documents[0];
	if (typeof firstDocument !== "object" || firstDocument === null) return false;
	const content = (firstDocument as { content?: unknown }).content;
	if (typeof content !== "object" || content === null) return false;
	if ((content as { _type?: unknown })._type !== "Canvas") return false;
	const canvasContent = (content as { _content?: unknown })._content;
	if (typeof canvasContent !== "object" || canvasContent === null) return false;
	return (
		Array.isArray((canvasContent as { nodes?: unknown }).nodes) &&
		Array.isArray((canvasContent as { edges?: unknown }).edges)
	);
}

function writeJson(res: ServerResponse, statusCode: number, body: unknown) {
	res.statusCode = statusCode;
	res.setHeader("content-type", "application/json");
	res.end(JSON.stringify(body));
}

async function startStubServer() {
	const requests: StubRequest[] = [];
	const canvasId = "507f1f77bcf86cd799439011";

	const server: Server = createServer(async (req, res) => {
		const url = req.url ?? "/";
		const method = req.method ?? "GET";
		const apiKey = req.headers["x-api-key"]
			? String(req.headers["x-api-key"])
			: null;

		if (method === "POST" && url === "/v1/document") {
			const body = await readJsonBody(req);
			if (!isCanvasCreateRequest(body)) {
				writeJson(res, 400, {
					error: "expected Canvas content when creating a canvas document",
				});
				return;
			}
			requests.push({ method, url, apiKey, body });
			writeJson(res, 200, {
				documents: [
					{
						_id: { $oid: canvasId },
						title: null,
						description: null,
						content: { _type: "Canvas", _content: { nodes: [], edges: [] } },
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
						generated: false,
						ownerId: "test-user",
					},
				],
			});
			return;
		}

		if (method === "PATCH" && url === `/v1/canvas/${canvasId}`) {
			const body = await readJsonBody(req);
			requests.push({ method, url, apiKey, body });
			writeJson(res, 200, {});
			return;
		}

		writeJson(res, 404, { error: `${method} ${url} not implemented in stub` });
	});

	await new Promise<void>((resolve) => {
		server.listen(0, "127.0.0.1", () => resolve());
	});

	const address = server.address();
	if (!address || typeof address === "string") {
		throw new Error("Failed to resolve stub server address");
	}

	return {
		apiUrl: `http://127.0.0.1:${address.port}`,
		appUrl: "https://ryzome.example.test",
		canvasId,
		requests,
		stop: async () =>
			await new Promise<void>((resolve, reject) => {
				server.close((error) => {
					if (error) {
						reject(error);
						return;
					}
					resolve();
				});
			}),
	};
}

async function packCoreTarball(tempDir: string) {
	execFileSync(getPnpmCommand(), ["pack", "--pack-destination", tempDir], {
		cwd: coreRoot,
		encoding: "utf8",
	});
	const entries = await fs.readdir(tempDir);
	const tarball = entries.find(
		(entry) => entry.endsWith(".tgz") && entry.includes("ryzome-core"),
	);
	if (!tarball) {
		throw new Error(`No ryzome-core tarball found in ${tempDir}`);
	}
	return path.join(tempDir, tarball);
}

async function installPackagedPlugin(stateDir: string) {
	const packDir = await createTempRoot("openclaw-ryzome-pack-");

	// Pack ryzome-core first (openclaw-ryzome depends on it)
	const coreTarball = await packCoreTarball(packDir);

	const tarballPath = await packPluginTarball(packDir);

	// Rewrite the plugin tarball so @ryzome-ai/ryzome-core resolves locally
	const unpackDir = path.join(packDir, "repack");
	await fs.mkdir(unpackDir, { recursive: true });
	execFileSync("tar", ["-xzf", tarballPath, "-C", unpackDir]);
	const pkgJsonPath = path.join(unpackDir, "package", "package.json");
	const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, "utf8"));
	if (pkgJson.dependencies?.["@ryzome-ai/ryzome-core"]) {
		pkgJson.dependencies["@ryzome-ai/ryzome-core"] = `file:${coreTarball}`;
	}
	await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
	const repackedTarball = path.join(packDir, "repacked-plugin.tgz");
	execFileSync("tar", ["-czf", repackedTarball, "-C", unpackDir, "package"]);

	const installOutput = runOpenClaw(
		["plugins", "install", repackedTarball],
		stateDir,
	);
	return { installOutput, tarballPath: repackedTarball };
}

afterEach(async () => {
	await Promise.all(
		[...tempRoots].map(async (dir) => {
			await fs.rm(dir, { recursive: true, force: true });
			tempRoots.delete(dir);
		}),
	);
});

describe("OpenClaw integration", () => {
	it("installs the packed plugin, configures it, and executes a stubbed canvas run", async () => {
		const stateDir = await createTempRoot("openclaw-ryzome-state-");
		const stub = await startStubServer();

		try {
			await installPackagedPlugin(stateDir);

			const configAfterInstall = await readConfig(stateDir);
			expect(
				configAfterInstall.plugins?.entries?.["openclaw-ryzome"]?.enabled,
			).toBe(true);
			expect(
				configAfterInstall.plugins?.installs?.["openclaw-ryzome"],
			).toBeTruthy();

			const statusBeforeConfig = runOpenClaw(["ryzome", "status"], stateDir);
			expect(statusBeforeConfig).toContain("No bound thread detected");

			await setPluginConfig(stateDir, {
				apiKey: "stub-api-key",
				apiUrl: stub.apiUrl,
				appUrl: stub.appUrl,
			});

			const statusAfterConfig = runOpenClaw(["ryzome", "status"], stateDir);
			expect(statusAfterConfig).toContain("Ryzome in circuit.");

			const configuredConfig = await readConfig(stateDir);
			expect(
				configuredConfig.plugins?.entries?.["openclaw-ryzome"]?.config,
			).toMatchObject({
				apiKey: "stub-api-key",
				apiUrl: stub.apiUrl,
				appUrl: stub.appUrl,
			});

			const result = await executeCreateCanvasTool(
				stateDir,
				configuredConfig,
				"Stubbed OpenClaw integration",
			);
			const resultText = result?.content?.[0]?.text ?? "";
			expect(resultText).toContain(
				"Canvas created: **Stubbed OpenClaw integration**",
			);
			expect(resultText).toContain(
				`View: ${stub.appUrl}/workspace?canvas=${stub.canvasId}`,
			);

			expect(stub.requests).toHaveLength(2);
			expect(stub.requests[0]).toMatchObject({
				method: "POST",
				url: "/v1/document",
				apiKey: "stub-api-key",
			});
			expect(stub.requests[0]?.body).toMatchObject({
				documents: [
					{
						content: {
							_type: "Canvas",
							_content: { nodes: [], edges: [] },
						},
					},
				],
			});
			expect(stub.requests[1]).toMatchObject({
				method: "PATCH",
				url: `/v1/canvas/${stub.canvasId}`,
				apiKey: "stub-api-key",
			});
			expect(stub.requests[1].body).toMatchObject({
				operations: expect.any(Array),
			});
		} finally {
			await stub.stop();
		}
	});

	it.skipIf(!liveSmokeEnabled || !liveSmokeApiKey)(
		"runs a live production smoke install, config, and canvas execution",
		async () => {
			const stateDir = await createTempRoot("openclaw-ryzome-live-state-");
			await installPackagedPlugin(stateDir);

			const apiUrl = liveSmokeApiUrl || "https://api.ryzome.ai";
			const appUrl = liveSmokeAppUrl || "https://ryzome.ai";
			const appBase = appUrl.replace(/\/+$/, "");

			await setPluginConfig(stateDir, {
				apiKey: liveSmokeApiKey ?? "",
				apiUrl,
				appUrl,
			});

			const statusAfterConfig = runOpenClaw(["ryzome", "status"], stateDir);
			expect(statusAfterConfig).toContain("Ryzome in circuit.");

			const configuredConfig = await readConfig(stateDir);
			const result = await executeCreateCanvasTool(
				stateDir,
				configuredConfig,
				`Live smoke ${new Date().toISOString()}`,
			);
			const resultText = result?.content?.[0]?.text ?? "";
			expect(resultText).toContain("Canvas created:");
			expect(resultText).toContain(`${appBase}/workspace?canvas=`);
		},
		180_000,
	);
});
