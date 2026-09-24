import { afterEach, expect, it, vi } from "vitest";
import { resolveCredentialStatus } from "../cli.js";

const envNames = [
	"RYZOME_API_KEY",
	"RYZOME_OPENCLAW_API_KEY",
	"PLUGIN_USER_CONFIG_API_KEY",
	"RYZOME_ACCESS_TOKEN",
	"PLUGIN_USER_CONFIG_ACCESS_TOKEN",
];
afterEach(() => vi.unstubAllEnvs());

it.each([
	{
		config: { accessToken: "config-token" },
		env: {},
		expected: {
			credential: "config-token",
			authMode: "bearer",
			source: "config",
		},
	},
	{
		config: {},
		env: { RYZOME_ACCESS_TOKEN: "env-token" },
		expected: {
			credential: "env-token",
			authMode: "bearer",
			source: "environment (RYZOME_ACCESS_TOKEN)",
		},
	},
	{
		config: { apiKey: "config-key" },
		env: { RYZOME_API_KEY: "env-key", RYZOME_ACCESS_TOKEN: "env-token" },
		expected: {
			credential: "config-key",
			authMode: "apiKey",
			source: "config",
		},
	},
	{
		config: {},
		env: {},
		expected: { credential: undefined, authMode: "apiKey", source: undefined },
	},
])(
	"status describes the credential selected for execution: $expected.authMode",
	({ config, env, expected }) => {
		for (const name of envNames) vi.stubEnv(name, undefined);
		for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
		expect(resolveCredentialStatus({ config })).toEqual(expected);
	},
);
