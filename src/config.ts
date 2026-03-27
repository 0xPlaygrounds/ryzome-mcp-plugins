export interface RyzomePluginConfig {
	apiKey?: string;
	apiUrl?: string;
	appUrl?: string;
}

export interface ResolvedRyzomePluginConfig {
	apiKey?: string;
	apiUrl: string;
	appUrl: string;
}

export const DEFAULT_RYZOME_API_URL = "https://api.ryzome.ai";
export const DEFAULT_RYZOME_APP_URL = "https://ryzome.ai";
export const RYZOME_API_KEY_ENV_VARS = [
	"RYZOME_OPENCLAW_API_KEY",
	"RYZOME_API_KEY",
] as const;

const ALLOWED_KEYS = ["apiKey", "apiUrl", "appUrl"];

function assertAllowedKeys(value: Record<string, unknown>): void {
	const unknown = Object.keys(value).filter(
		(key) => !ALLOWED_KEYS.includes(key),
	);
	if (unknown.length > 0) {
		throw new Error(`ryzome config has unknown keys: ${unknown.join(", ")}`);
	}
}

function resolveEnvVars(value: string): string {
	return value.replace(/\$\{([^}]+)\}/g, (_match, envVar: string) => {
		const resolved = process.env[envVar];
		if (!resolved) {
			throw new Error(`Environment variable ${envVar} is not set`);
		}
		return resolved;
	});
}

function resolveApiKeyFromEnv(): string | undefined {
	for (const envVar of RYZOME_API_KEY_ENV_VARS) {
		const value = process.env[envVar];
		if (typeof value === "string" && value.trim()) {
			return value;
		}
	}

	return undefined;
}

export function parseConfig(raw: unknown): ResolvedRyzomePluginConfig {
	const cfg =
		raw && typeof raw === "object" && !Array.isArray(raw)
			? (raw as Record<string, unknown>)
			: {};

	if (Object.keys(cfg).length > 0) {
		assertAllowedKeys(cfg);
	}

	let apiKey: string | undefined;
	try {
		apiKey =
			typeof cfg.apiKey === "string" && cfg.apiKey.trim().length > 0
				? resolveEnvVars(cfg.apiKey.trim())
				: resolveApiKeyFromEnv();
	} catch {
		apiKey = undefined;
	}

	return {
		apiKey,
		apiUrl:
			typeof cfg.apiUrl === "string" && cfg.apiUrl.trim()
				? cfg.apiUrl.trim()
				: DEFAULT_RYZOME_API_URL,
		appUrl:
			typeof cfg.appUrl === "string" && cfg.appUrl.trim()
				? cfg.appUrl.trim()
				: DEFAULT_RYZOME_APP_URL,
	};
}
