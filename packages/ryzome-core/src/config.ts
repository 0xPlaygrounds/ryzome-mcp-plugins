import type { RyzomeClientConfig } from "./lib/ryzome-client.js";
export type RyzomeAuthMode = "apiKey" | "bearer";

export interface RyzomePluginConfig {
	apiKey?: string;
	accessToken?: string;
	apiUrl?: string;
	appUrl?: string;
}

export interface ResolvedRyzomePluginConfig {
	apiKey?: string;
	accessToken?: string;
	authMode: RyzomeAuthMode;
	apiUrl: string;
	appUrl: string;
}

export const DEFAULT_RYZOME_API_URL = "https://api.ryzome.ai";
export const DEFAULT_RYZOME_APP_URL = "https://ryzome.ai";
export const RYZOME_API_KEY_ENV_VARS = [
	"RYZOME_OPENCLAW_API_KEY",
	"RYZOME_API_KEY",
	"PLUGIN_USER_CONFIG_API_KEY",
] as const;
export const RYZOME_ACCESS_TOKEN_ENV_VARS = [
	"RYZOME_ACCESS_TOKEN",
	"PLUGIN_USER_CONFIG_ACCESS_TOKEN",
] as const;

/** One-line hint listing every credential source, for "not configured" errors. */
export const RYZOME_CREDENTIAL_SETUP_HINT =
	"Set RYZOME_API_KEY (API key, sent as x-api-key) or RYZOME_ACCESS_TOKEN (bearer token, sent as Authorization: Bearer).";

const ALLOWED_KEYS = ["apiKey", "accessToken", "apiUrl", "appUrl"];

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

function resolveFromEnv(envVars: readonly string[]): string | undefined {
	for (const envVar of envVars) {
		const value = process.env[envVar];
		if (typeof value === "string" && value.trim()) {
			return value;
		}
	}

	return undefined;
}

function resolveSecret(
	raw: unknown,
	envVars: readonly string[],
): string | undefined {
	try {
		return typeof raw === "string" && raw.trim().length > 0
			? resolveEnvVars(raw.trim())
			: resolveFromEnv(envVars);
	} catch {
		return undefined;
	}
}

export function parseConfig(raw: unknown): ResolvedRyzomePluginConfig {
	const cfg =
		raw && typeof raw === "object" && !Array.isArray(raw)
			? (raw as Record<string, unknown>)
			: {};

	if (Object.keys(cfg).length > 0) {
		assertAllowedKeys(cfg);
	}

	const apiKey = resolveSecret(cfg.apiKey, RYZOME_API_KEY_ENV_VARS);
	const accessToken = resolveSecret(
		cfg.accessToken,
		RYZOME_ACCESS_TOKEN_ENV_VARS,
	);

	// An API key always wins; bearer is used only when it is the sole credential.
	const authMode: RyzomeAuthMode = !apiKey && accessToken ? "bearer" : "apiKey";

	return {
		apiKey,
		accessToken,
		authMode,
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

/** True when the config carries a credential usable by the client. */
export function hasCredential(
	cfg: Pick<ResolvedRyzomePluginConfig, "apiKey" | "accessToken">,
): boolean {
	return Boolean(cfg.apiKey || cfg.accessToken);
}

/**
 * Project a resolved plugin config onto the client config shape, or `null`
 * when no credential is available. Adapters use this for the lazy setup check.
 */
export function toClientConfig(
	cfg: ResolvedRyzomePluginConfig,
): RyzomeClientConfig | null {
	if (!hasCredential(cfg)) return null;
	return {
		apiKey: cfg.apiKey,
		accessToken: cfg.accessToken,
		authMode: cfg.authMode,
		apiUrl: cfg.apiUrl,
		appUrl: cfg.appUrl,
	};
}
