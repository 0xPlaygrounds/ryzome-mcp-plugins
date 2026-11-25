import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, stat, chmod } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
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
			if (form.get("token") === "r1" && lostResponse)
				return new Response(null, { status: 400 });
			const reauthorized = form.get("code") === "reconnect";
			const rotate = form.get("grant_type") === "refresh_token";
			if (rotate && lostResponse) throw new Error("Connection closed");
			return Response.json({
				access_token: reauthorized ? "reconnected" : rotate ? "new" : "old",
				refresh_token: reauthorized ? "r3" : rotate ? "r2" : "r1",
				expires_in: rotate || reauthorized ? 900 : 1,
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
			if (lostResponse) {
				const nextLink = new Promise<string>((resolve) => {
					onPrinted = resolve;
				});
				const reconnect = oauthCommand("login", "id");
				const nextAuth = new URL(await nextLink);
				const nextCallback = new URL(
					nextAuth.searchParams.get("redirect_uri")!,
				);
				nextCallback.search = new URLSearchParams({
					iss: "https://auth.ryzome.ai/v1",
					state: nextAuth.searchParams.get("state")!,
					code: "reconnect",
				}).toString();
				expect((await browser(nextCallback)).status).toBe(200);
				await reconnect;
				expect(await accessToken("id")).toBe("reconnected");
			}
			await oauthCommand("logout", "id");
			expect(calls.slice(-2).map((c) => c.get("token"))).toEqual(
				lostResponse ? ["reconnected", "r3"] : ["new", "r2"],
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

it("revokes a rotated grant when saving it fails", async () => {
	const home = await mkdtemp(join(tmpdir(), "ryzome-grant-"));
	const dir = join(home, ".ryzome-mcp");
	const file = join(dir, "oauth.sqlite");
	vi.stubEnv("HOME", home);
	try {
		await mkdir(dir);
		const db = new DatabaseSync(file);
		try {
			db.exec(
				"CREATE TABLE grants (client TEXT PRIMARY KEY, value TEXT NOT NULL)",
			);
			db.prepare("INSERT INTO grants VALUES (?,?)").run(
				"id",
				JSON.stringify({
					access: "old",
					refresh: "r1",
					expires: 0,
					scope: "openid profile email",
				}),
			);
			db.exec(
				"CREATE TRIGGER fail_save BEFORE UPDATE ON grants WHEN json_extract(NEW.value, '$.access') = 'new' BEGIN SELECT RAISE(ABORT, 'failed to persist'); END",
			);
		} finally {
			db.close();
		}
		if (process.platform !== "win32") {
			await chmod(dir, 0o755);
			await chmod(file, 0o644);
		}
		const revoked: string[] = [];
		vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
			const fields = new URLSearchParams(String(init.body));
			const token = fields.get("token");
			if (token) {
				revoked.push(token);
				return new Response(null);
			}
			return Response.json({
				access_token: "new",
				refresh_token: "r2",
				expires_in: 900,
				token_type: "Bearer",
			});
		});
		await expect(accessToken("id")).rejects.toThrow(/failed to persist/);
		expect(revoked.sort()).toEqual(["new", "r2"]);
		if (process.platform !== "win32") {
			expect((await stat(dir)).mode & 0o777).toBe(0o700);
			expect((await stat(file)).mode & 0o777).toBe(0o600);
		}
	} finally {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		await rm(home, { recursive: true, force: true });
	}
});
