import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { accessToken, oauthCommand } from "../oauth.js";

it("signs in and shares a rotated grant without replaying a lost refresh", async () => {
	const home = await mkdtemp(join(tmpdir(), "ryzome-oauth-"));
	const browser = globalThis.fetch;
	const token = (access: string, refresh: string) =>
		Response.json({
			access_token: access,
			refresh_token: refresh,
			expires_in: 900,
			token_type: "Bearer",
			scope: "openid profile email offline_access documents:read",
		});
	const provider = vi
		.fn<typeof fetch>()
		.mockResolvedValueOnce(token("a1", "r1"))
		.mockResolvedValueOnce(token("a2", "r2"))
		.mockRejectedValueOnce(new Error("Refresh response lost"))
		.mockImplementation(async () => new Response(null));
	const forms = () =>
		provider.mock.calls.map(
			([, init]) => new URLSearchParams(String(init?.body)),
		);
	try {
		vi.stubEnv(process.platform === "win32" ? "USERPROFILE" : "HOME", home);
		expect(homedir()).toBe(home);
		vi.stubGlobal("fetch", provider);
		const printed = new Promise<URL>((resolve) => {
			vi.spyOn(console, "error").mockImplementation((message) => {
				const link = String(message).split("\n")[1];
				if (link) resolve(new URL(link));
			});
		});
		const login = oauthCommand("login", "client");
		const auth = await printed;
		const callback = new URL(auth.searchParams.get("redirect_uri")!);
		callback.search = new URLSearchParams({
			iss: "https://auth.ryzome.ai/v1",
			state: "wrong",
			code: "code",
		}).toString();
		expect((await browser(callback)).status).toBe(400);
		callback.searchParams.set("state", auth.searchParams.get("state")!);
		expect((await browser(callback)).status).toBe(200);
		await login;
		const verifier = forms()[0].get("code_verifier")!;
		expect(createHash("sha256").update(verifier).digest("base64url")).toBe(
			auth.searchParams.get("code_challenge"),
		);

		const now = Date.now();
		const clock = vi.spyOn(Date, "now").mockReturnValue(now + 900_000);
		expect(
			await Promise.all([accessToken("client"), accessToken("client")]),
		).toEqual(["a2", "a2"]);
		clock.mockReturnValue(now + 1_800_000);
		await expect(accessToken("client")).rejects.toThrow(/login/);
		await expect(accessToken("client")).rejects.toThrow(/login/);
		expect(forms().flatMap((form) => form.getAll("refresh_token"))).toEqual([
			"r1",
			"r2",
		]);

		await oauthCommand("logout", "client");
		expect(
			forms()
				.flatMap((form) => form.getAll("token"))
				.sort(),
		).toEqual(["a2", "r2"]);
		await expect(accessToken("client")).rejects.toThrow(/login/);
	} finally {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		await rm(home, { recursive: true, force: true });
	}
});
