import { z } from "zod";
import { parseConfig, toolRegistry } from "@ryzome-ai/ryzome-core";
import type { RyzomeClientConfig } from "@ryzome-ai/ryzome-core";
import { registerCliSetup } from "./cli.js";

const RYZOME_SETUP_GUIDE_URL = "https://ryzome.ai/claw";
const RYZOME_API_KEY_URL = "https://ryzome.ai/api-key";

interface PluginApi {
	pluginConfig?: Record<string, unknown>;
	runtime: {
		config: {
			loadConfig: () => unknown;
			writeConfigFile: (config: unknown) => Promise<void> | void;
		};
	};
	logger: {
		info: (...args: unknown[]) => void;
		error: (...args: unknown[]) => void;
		warn?: (...args: unknown[]) => void;
	};
	registerCli: (
		registrar: (context: { program: unknown }) => void,
		opts?: { commands?: string[] },
	) => void;
	registerTool: (
		def: {
			name: string;
			description: string;
			parameters: unknown;
			execute: (
				id: string,
				params: Record<string, unknown>,
			) => Promise<{ content: Array<{ type: string; text: string }> }>;
		},
		opts?: { optional?: boolean },
	) => void;
}

function logSetupHint(api: PluginApi) {
	api.logger.info(
		"[ryzome] context engine detected, but the thread is still unbound.",
	);
	api.logger.info("[ryzome] run: openclaw ryzome setup --key <api-key>");
	api.logger.info(`[ryzome] guide: ${RYZOME_SETUP_GUIDE_URL}`);
	api.logger.info(`[ryzome] get a key: ${RYZOME_API_KEY_URL}`);
	api.logger.info("[ryzome] env fallback: RYZOME_OPENCLAW_API_KEY");
}

function resolveConfig(api: PluginApi): RyzomeClientConfig {
	const cfg = parseConfig(api.pluginConfig);
	if (!cfg.apiKey) {
		throw new Error(
			`Ryzome plugin: apiKey is required. Run: openclaw ryzome setup --key <api-key>  (guide: ${RYZOME_SETUP_GUIDE_URL})`,
		);
	}
	return {
		apiKey: cfg.apiKey,
		apiUrl: cfg.apiUrl,
		appUrl: cfg.appUrl,
	};
}

export default function register(api: PluginApi) {
	registerCliSetup(api);
	api.logger.info("[ryzome] plugin loaded");

	let clientConfig: RyzomeClientConfig;
	try {
		clientConfig = resolveConfig(api);
	} catch (err) {
		logSetupHint(api);
		if (err instanceof Error) {
			api.logger.info(`[ryzome] ${err.message}`);
		}
		return;
	}

	const toolNames: string[] = [];

	for (const tool of toolRegistry) {
		api.registerTool({
			name: tool.name,
			description: tool.description,
			parameters: z.toJSONSchema(tool.paramsSchema),
			async execute(_id, params) {
				return tool.execute(params, clientConfig);
			},
		});
		toolNames.push(tool.name);
	}

	api.logger.info(`[ryzome] registered tools: ${toolNames.join(", ")}`);
}
