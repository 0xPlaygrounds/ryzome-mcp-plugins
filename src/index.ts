import { registerCliSetup } from "./cli.js";
import { parseConfig } from "./config.js";
import type { RyzomeClientConfig } from "./lib/ryzome-client.js";
import {
  createCanvasToolDef,
  executeCreateCanvas,
} from "./tools/create-canvas.js";
import { executeGetCanvas, getCanvasToolDef } from "./tools/get-canvas.js";
import { planCanvasToolDef, executePlanCanvas } from "./tools/plan-canvas.js";
import {
  researchCanvasToolDef,
  executeResearchCanvas,
} from "./tools/research-canvas.js";

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

const RYZOME_SETUP_GUIDE_URL = "https://ryzome.ai/claw";
const RYZOME_API_KEY_URL = "https://ryzome.ai/api-key";

function logSetupHint(api: PluginApi) {
  api.logger.info("[ryzome] context engine detected, but the thread is still unbound.");
  api.logger.info("[ryzome] bind it: openclaw ryzome setup");
  api.logger.info(`[ryzome] map the connection: ${RYZOME_SETUP_GUIDE_URL}`);
  api.logger.info(`[ryzome] mint a key: ${RYZOME_API_KEY_URL}`);
  api.logger.info("[ryzome] until then, the model sees the outline of context, not the thing itself.");
  api.logger.info("[ryzome] env fallback: RYZOME_OPENCLAW_API_KEY");
}

function resolveConfig(api: PluginApi): RyzomeClientConfig {
  const cfg = parseConfig(api.pluginConfig);
  if (!cfg.apiKey) {
    throw new Error(
      `Ryzome plugin: apiKey is required in config or env. Bind the thread with 'openclaw ryzome setup' or see ${RYZOME_SETUP_GUIDE_URL}`,
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

  api.registerTool({
    ...createCanvasToolDef,
    async execute(id, params) {
      return executeCreateCanvas(id, params, clientConfig);
    },
  });

  api.registerTool({
    ...getCanvasToolDef,
    async execute(id, params) {
      return executeGetCanvas(id, params, clientConfig);
    },
  });

  api.registerTool({
    ...planCanvasToolDef,
    async execute(id, params) {
      return executePlanCanvas(id, params, clientConfig);
    },
  });

  api.registerTool({
    ...researchCanvasToolDef,
    async execute(id, params) {
      return executeResearchCanvas(id, params, clientConfig);
    },
  });

  api.logger.info(
    "[ryzome] registered tools: create_ryzome_canvas, get_ryzome_canvas, create_ryzome_plan, create_ryzome_research",
  );
}
