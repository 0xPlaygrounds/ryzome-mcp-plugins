import readline from "node:readline";
import {
	DEFAULT_RYZOME_API_URL,
	DEFAULT_RYZOME_APP_URL,
	parseConfig,
	RYZOME_API_KEY_ENV_VARS,
} from "@ryzome-ai/ryzome-core";
import {
	accent,
	bold,
	dim,
	info,
	success,
	visibleWidth,
	wrapText,
} from "./cli-theme.js";
import { printDemoHints, promptDemoCanvas } from "./onboarding.js";

type RyzomePluginEntry = {
	enabled?: boolean;
	config?: Record<string, unknown>;
};

type OpenClawLikeConfig = {
	plugins?: {
		entries?: Record<string, RyzomePluginEntry | undefined>;
	};
};

type CliCommand = {
	command(name: string): CliCommand;
	description(text: string): CliCommand;
	option(flags: string, description?: string): CliCommand;
	action(
		handler: (options: Record<string, string>) => void | Promise<void>,
	): CliCommand;
	name(): string;
	commands?: CliCommand[];
};

type PluginApi = {
	runtime: {
		config: {
			loadConfig: () => unknown;
			writeConfigFile: (config: unknown) => Promise<void> | void;
		};
	};
	registerCli: (
		registrar: (context: { program: unknown }) => void,
		opts?: { commands?: string[] },
	) => void;
};

function maskSecret(value: string): string {
	if (value.length <= 12) {
		return value;
	}

	return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function createPrompt() {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	const ask = (question: string) =>
		new Promise<string>((resolve) => {
			rl.question(question, resolve);
		});

	return {
		ask,
		close: () => rl.close(),
	};
}

function asOpenClawLikeConfig(value: unknown): OpenClawLikeConfig {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value as OpenClawLikeConfig;
	}

	return {};
}

function resolveApiKeyStatus(entry: RyzomePluginEntry | undefined): {
	apiKey?: string;
	source?: string;
} {
	const envVar = RYZOME_API_KEY_ENV_VARS.find((name) => {
		const value = process.env[name];
		return typeof value === "string" && value.trim().length > 0;
	});
	if (envVar) {
		return { apiKey: process.env[envVar], source: `environment (${envVar})` };
	}

	const rawConfig = entry?.config;
	const parsed = parseConfig(rawConfig);
	if (parsed.apiKey) {
		return { apiKey: parsed.apiKey, source: "config" };
	}

	return {};
}

function centerPad(content: string, totalWidth: number): string {
	const w = visibleWidth(content);
	if (w >= totalWidth) return content;
	const left = Math.floor((totalWidth - w) / 2);
	const right = totalWidth - w - left;
	return " ".repeat(left) + content + " ".repeat(right);
}

function printSetupHeader() {
	const cols = process.stdout.columns || 80;
	const margin = 2;

	const titleLine = `🫚  ${bold(accent("R Y Z O M E"))}  🫚`;
	const subtitleLine = "context that grows with you";

	const titleWidth = visibleWidth(titleLine);
	const subtitleWidth = visibleWidth(subtitleLine);
	const contentWidth = Math.max(titleWidth, subtitleWidth);
	const innerWidth = contentWidth + 4; // 2 padding each side
	const boxWidth = innerWidth + 2; // + 2 for │ chars

	const prose =
		"Where does the config end and the context begin? You're about to weave the first thread between this terminal and your ryzome.";

	if (boxWidth + margin > cols || cols < 30) {
		// Narrow terminal — skip the box
		const textWidth = Math.max(cols - margin * 2, 20);
		const lines = [
			"",
			`${"  "}${titleLine}`,
			`${"  "}${dim(subtitleLine)}`,
			"",
			...wrapText(prose, textWidth).map((l) => dim(`${"  "}${l}`)),
			"",
		];
		console.log(lines.join("\n"));
		return;
	}

	const pad = " ".repeat(margin);
	const hr = "─".repeat(innerWidth);
	const proseWidth = Math.max(cols - margin * 2, 20);

	const lines = [
		"",
		dim(`${pad}╭${hr}╮`),
		`${dim(`${pad}│`)}${centerPad(titleLine, innerWidth)}${dim("│")}`,
		`${dim(`${pad}│`)}${centerPad(dim(subtitleLine), innerWidth)}${dim("│")}`,
		dim(`${pad}╰${hr}╯`),
		"",
		...wrapText(prose, proseWidth).map((l) => dim(`${pad}${l}`)),
		"",
	];
	console.log(lines.join("\n"));
}

function printSetupGuide() {
	const lines = [
		accent("  Signal sources"),
		`  ${dim("Instructions:")} https://ryzome.ai/claw`,
		`  ${dim("API Key:  ")} ${DEFAULT_RYZOME_APP_URL}/workspace#settings/api-keys`,
		"",
	];
	console.log(lines.join("\n"));
}

function printSetupSuccess(params: {
	apiKey: string;
	apiUrl: string;
	appUrl: string;
}) {
	const { apiKey, apiUrl, appUrl } = params;
	const lines = [
		"",
		success(" 🫚 Ryzome internode bond established."),
		"",
		dim("  The boundary has softened. Your local environment now reaches into"),
		dim("  your context library — what you've mapped and what you will map."),
		"",
		`${accent("  Synapse:")} ${maskSecret(apiKey)}`,
		`${accent("  API:   ")} ${apiUrl || DEFAULT_RYZOME_API_URL}`,
		`${accent("  App:   ")} ${appUrl || DEFAULT_RYZOME_APP_URL}`,
		"",
		info(
			"  🌀 The map is live. The next output can actually touch your context.",
		),
		"",
		dim("  Restart OpenClaw to feel the difference:"),
		bold(`  openclaw gateway restart`),
		"",
	];
	console.log(lines.join("\n"));
}

function printStatusHeader() {
	const lines = ["", dim("  🌱 Ryzome • status check"), ""];
	console.log(lines.join("\n"));
}

export function registerCliSetup(api: PluginApi): void {
	api.registerCli(
		({ program }) => {
			const cliProgram = program as CliCommand;
			const cmd = cliProgram
				.command("ryzome")
				.description("Ryzome canvas plugin commands");

			cmd
				.command("setup")
				.description("Configure the Ryzome API key for this plugin")
				.option("--key <api-key>", "Ryzome API key")
				.option("--api-url <url>", "Ryzome API URL")
				.option("--app-url <url>", "Ryzome App URL")
				.action(async (options) => {
					const nonInteractive = !!options.key;

					if (!nonInteractive && !process.stdin.isTTY) {
						console.error(
							"Error: No TTY available for interactive prompts. Pass the key directly: openclaw ryzome setup --key <api-key>",
						);
						process.exitCode = 1;
						return;
					}

					printSetupHeader();

					if (!nonInteractive) {
						printSetupGuide();
					}

					const prompt = createPrompt();

					try {
						const apiKey = nonInteractive
							? options.key
							: (
									await prompt.ask(
										accent(
											"  🔗 Paste your API key (bind your claw to the ryzome): ",
										) + dim("[required] "),
									)
								).trim();

						if (!apiKey) {
							console.log("");
							console.log(
								dim("  No key provided. The thread remains unbound."),
							);
							console.log("");
							return;
						}

						const apiUrl = options.apiUrl
							? options.apiUrl
							: nonInteractive
								? ""
								: (
										await prompt.ask(
											dim(`  API URL [${DEFAULT_RYZOME_API_URL}]: `),
										)
									).trim();

						const appUrl = options.appUrl
							? options.appUrl
							: nonInteractive
								? ""
								: (
										await prompt.ask(
											dim(`  App URL [${DEFAULT_RYZOME_APP_URL}]: `),
										)
									).trim();

						const current = asOpenClawLikeConfig(
							api.runtime.config.loadConfig(),
						);
						const entries = current.plugins?.entries ?? {};
						const existingEntry = entries["openclaw-ryzome"] ?? {};
						const nextEntry: RyzomePluginEntry = {
							...existingEntry,
							enabled: true,
							config: {
								...(existingEntry.config ?? {}),
								apiKey,
								...(apiUrl ? { apiUrl } : {}),
								...(appUrl ? { appUrl } : {}),
							},
						};

						const nextConfig: OpenClawLikeConfig = {
							...current,
							plugins: {
								...current.plugins,
								entries: {
									...entries,
									"openclaw-ryzome": nextEntry,
								},
							},
						};

						await api.runtime.config.writeConfigFile(nextConfig);

						printSetupSuccess({
							apiKey,
							apiUrl: apiUrl || DEFAULT_RYZOME_API_URL,
							appUrl: appUrl || DEFAULT_RYZOME_APP_URL,
						});

						if (nonInteractive) {
							printDemoHints();
						} else {
							await promptDemoCanvas(prompt.ask);
						}
					} finally {
						prompt.close();
					}
				});

			cmd
				.command("status")
				.description("Show the current Ryzome plugin configuration status")
				.action(() => {
					const current = asOpenClawLikeConfig(api.runtime.config.loadConfig());
					const entry = current.plugins?.entries?.["openclaw-ryzome"];
					const resolved = parseConfig(entry?.config);
					const apiKeyStatus = resolveApiKeyStatus(entry);

					printStatusHeader();

					if (!apiKeyStatus.apiKey) {
						console.log(
							dim(
								"  No bound thread detected. The rhizome stays out of circuit.",
							),
						);
						console.log("");
						console.log(dim("  Bind it:") + bold(" openclaw ryzome setup"));
						console.log(dim("  Map it:  https://ryzome.ai/claw"));
						console.log("");
						return;
					}

					console.log(
						success(" 🫚 Ryzome in circuit.") +
							dim(` (key from ${apiKeyStatus.source})`),
					);
					console.log("");
					console.log(accent("  Key:     ") + maskSecret(apiKeyStatus.apiKey));
					console.log(
						accent("  Enabled: ") +
							((entry?.enabled ?? true) ? success("yes") : dim("no")),
					);
					console.log(accent("  API:     ") + resolved.apiUrl);
					console.log(accent("  App:     ") + resolved.appUrl);
					console.log("");
					console.log(
						dim("  Your context is mapped. Outputs land closer to intent."),
					);
					console.log(
						info(
							"  The map and the reply are finally looking at the same thing.",
						),
					);
					console.log("");
				});
		},
		{ commands: ["ryzome"] },
	);
}
