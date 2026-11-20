import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { accessToken, oauthCommand } from "../oauth.js";

it.each([false, true])(
	"validates the callback and consumes each refresh token once (lost response=%s)",
	async (lostResponse) => {
		const dir = await mkdtemp(join(tmpdir(), "ryzome-oauth-"));
		const browser = globalThis.fetch;
		let onPrinted!: (url: string) => void;
		const printed = new Promise<string>((resolve) => {
			onPrinted = resolve;
		});
		vi.stubEnv("HOME", dir);
		vi.spyOn(console, "error").mockImplementation((message) => {
			if (String(message).includes("\n"))
				onPrinted(String(message).split("\n")[1]);
		});
		const calls: URLSearchParams[] = [];
		vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
			const form = new URLSearchParams(String(init.body));
			calls.push(form);
			const rotate = form.get("grant_type") === "refresh_token";
			if (rotate && lostResponse) throw new Error("Connection closed");
			return Response.json({
				access_token: rotate ? "new" : "old",
				refresh_token: rotate ? "r2" : "r1",
				expires_in: rotate ? 900 : 1,
				token_type: "Bearer",
				scope: "openid profile email offline_access documents:read",
			});
		});
		try {
			const login = oauthCommand("login", "id");
			const auth = new URL(
				await Promise.race([
					printed,
					login.then(() => {
						throw new Error("Login ended before callback");
					}),
				]),
			);
			const callback = new URL(auth.searchParams.get("redirect_uri")!);
			callback.search = new URLSearchParams({
				iss: "https://auth.ryzome.ai/v1",
				state: "incorrect",
				code: "auth-code",
			}).toString();
			expect((await browser(callback)).status).toBe(400);
			callback.searchParams.set("state", auth.searchParams.get("state")!);
			expect((await browser(callback)).status).toBe(200);
			await login;
			expect(
				createHash("sha256")
					.update(calls[0].get("code_verifier")!)
					.digest("base64url"),
			).toBe(auth.searchParams.get("code_challenge"));
			if (lostResponse) {
				await expect(accessToken("id")).rejects.toThrow(/login/);
				await expect(accessToken("id")).rejects.toThrow(/login/);
			} else
				expect(
					await Promise.all([accessToken("id"), accessToken("id")]),
				).toEqual(["new", "new"]);
			expect(calls.filter((c) => c.get("refresh_token") === "r1")).toHaveLength(
				1,
			);
			await oauthCommand("logout", "id");
			expect(calls.slice(-2).map((c) => c.get("token"))).toEqual(
				lostResponse ? ["old", "r1"] : ["new", "r2"],
			);
			await expect(accessToken("id")).rejects.toThrow(/login/);
		} finally {
			vi.unstubAllEnvs();
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
			await rm(dir, { recursive: true, force: true });
		}
	},
);
