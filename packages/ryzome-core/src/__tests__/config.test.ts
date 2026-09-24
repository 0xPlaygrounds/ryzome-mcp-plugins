import { afterEach, describe, expect, it } from "vitest";
import {
	DEFAULT_RYZOME_API_URL,
	DEFAULT_RYZOME_APP_URL,
	parseConfig,
} from "../config";

const ORIGINAL_RYZOME_OPENCLAW_API_KEY = process.env.RYZOME_OPENCLAW_API_KEY;
const ORIGINAL_RYZOME_API_KEY = process.env.RYZOME_API_KEY;
const ORIGINAL_RYZOME_ACCESS_TOKEN = process.env.RYZOME_ACCESS_TOKEN;

afterEach(() => {
	if (ORIGINAL_RYZOME_ACCESS_TOKEN === undefined) {
		delete process.env.RYZOME_ACCESS_TOKEN;
	} else {
		process.env.RYZOME_ACCESS_TOKEN = ORIGINAL_RYZOME_ACCESS_TOKEN;
	}

	if (ORIGINAL_RYZOME_OPENCLAW_API_KEY === undefined) {
		delete process.env.RYZOME_OPENCLAW_API_KEY;
	} else {
		process.env.RYZOME_OPENCLAW_API_KEY = ORIGINAL_RYZOME_OPENCLAW_API_KEY;
	}

	if (ORIGINAL_RYZOME_API_KEY === undefined) {
		delete process.env.RYZOME_API_KEY;
	} else {
		process.env.RYZOME_API_KEY = ORIGINAL_RYZOME_API_KEY;
	}
});

describe("parseConfig", () => {
	it("accepts an empty config during install and uses defaults", () => {
		delete process.env.RYZOME_OPENCLAW_API_KEY;
		delete process.env.RYZOME_API_KEY;
		delete process.env.RYZOME_ACCESS_TOKEN;

		expect(parseConfig({})).toEqual({
			apiKey: undefined,
			accessToken: undefined,
			authMode: "apiKey",
			apiUrl: DEFAULT_RYZOME_API_URL,
			appUrl: DEFAULT_RYZOME_APP_URL,
		});
	});

	it("resolves apiKey from a config env reference", () => {
		process.env.RYZOME_OPENCLAW_API_KEY = "rz_env_key";
		delete process.env.RYZOME_API_KEY;
		const apiKeyRef = "$" + "{RYZOME_OPENCLAW_API_KEY}";

		expect(parseConfig({ apiKey: apiKeyRef })).toEqual({
			apiKey: "rz_env_key",
			accessToken: undefined,
			authMode: "apiKey",
			apiUrl: DEFAULT_RYZOME_API_URL,
			appUrl: DEFAULT_RYZOME_APP_URL,
		});
	});

	it("falls back to plugin-scoped env vars when config omits apiKey", () => {
		delete process.env.RYZOME_OPENCLAW_API_KEY;
		process.env.RYZOME_API_KEY = "rz_fallback_key";

		expect(parseConfig({ apiUrl: "https://api.example.com" })).toEqual({
			apiKey: "rz_fallback_key",
			accessToken: undefined,
			authMode: "apiKey",
			apiUrl: "https://api.example.com",
			appUrl: DEFAULT_RYZOME_APP_URL,
		});
	});

	it("prefers the API key over an access token when both are set", () => {
		process.env.RYZOME_API_KEY = "rz_key";
		process.env.RYZOME_ACCESS_TOKEN = "eyJ.bearer.token";

		expect(parseConfig({})).toMatchObject({
			apiKey: "rz_key",
			accessToken: "eyJ.bearer.token",
			authMode: "apiKey",
		});
	});

	it("accepts accessToken from config with env references", () => {
		delete process.env.RYZOME_OPENCLAW_API_KEY;
		delete process.env.RYZOME_API_KEY;
		process.env.RYZOME_ACCESS_TOKEN = "eyJ.from.env";
		const ref = "$" + "{RYZOME_ACCESS_TOKEN}";

		expect(parseConfig({ accessToken: ref })).toMatchObject({
			accessToken: "eyJ.from.env",
			authMode: "bearer",
		});
	});

	it("rejects unknown config keys", () => {
		expect(() => parseConfig({ nope: true })).toThrow(
			"ryzome config has unknown keys: nope",
		);
	});
});
