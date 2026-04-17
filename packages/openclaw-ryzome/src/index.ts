import {
	parseConfig,
	type RyzomeClientConfig,
	toolRegistry,
} from "@ryzome-ai/ryzome-core";
import {
	definePluginEntry,
	type OpenClawPluginApi,
} from "openclaw/plugin-sdk/plugin-entry";
import { z } from "zod";
import { registerCliSetup } from "./cli.js";

const RYZOME_SETUP_GUIDE_URL = "https://ryzome.ai/claw";
const RYZOME_API_KEY_URL = "https://ryzome.ai/api-key";

function tryResolveConfig(api: OpenClawPluginApi): RyzomeClientConfig | null {
	const cfg = parseConfig(api.pluginConfig);
	if (!cfg.apiKey) {
		return null;
	}
	return {
		apiKey: cfg.apiKey,
		apiUrl: cfg.apiUrl,
		appUrl: cfg.appUrl,
	};
}

function logSetupHint(api: OpenClawPluginApi): void {
	api.logger.info(
		"[ryzome] context engine detected, but the thread is still unbound.",
	);
	api.logger.info("[ryzome] run: openclaw ryzome setup --key <api-key>");
	api.logger.info(`[ryzome] guide: ${RYZOME_SETUP_GUIDE_URL}`);
	api.logger.info(`[ryzome] get a key: ${RYZOME_API_KEY_URL}`);
	api.logger.info("[ryzome] env fallback: RYZOME_OPENCLAW_API_KEY");
}

function toolLabel(name: string): string {
	return name
		.split("_")
		.map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
		.join(" ");
}

function missingApiKeyError(): Error {
	return new Error(
		`Ryzome plugin: apiKey is not configured. Run: openclaw ryzome setup --key <api-key>  (guide: ${RYZOME_SETUP_GUIDE_URL})`,
	);
}

export default definePluginEntry({
	id: "openclaw-ryzome",
	name: "Ryzome Canvas OpenClaw Plugin",
	description: "Create Ryzome canvases from plans and research",
	register(api) {
		registerCliSetup(api);
		api.logger.info("[ryzome] plugin loaded");

		if (!tryResolveConfig(api)) {
			logSetupHint(api);
		}

		const toolNames: string[] = [];

		for (const tool of toolRegistry) {
			api.registerTool({
				name: tool.name,
				label: toolLabel(tool.name),
				description: tool.description,
				parameters: z.toJSONSchema(tool.paramsSchema),
				async execute(_toolCallId, params) {
					const clientConfig = tryResolveConfig(api);
					if (!clientConfig) {
						throw missingApiKeyError();
					}
					const result = await tool.execute(
						params as Record<string, unknown>,
						clientConfig,
					);
					return { ...result, details: undefined };
				},
			});
			toolNames.push(tool.name);
		}

		api.logger.info(`[ryzome] registered tools: ${toolNames.join(", ")}`);
	},
});
