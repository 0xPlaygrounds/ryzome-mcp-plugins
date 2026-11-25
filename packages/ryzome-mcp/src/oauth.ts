import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, openSync, closeSync, constants, fchmodSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";

const issuer = "https://auth.ryzome.ai/v1";
const identity = ["openid", "profile", "email"];
const scopes = [
	...identity,
	"offline_access",
	"documents:read",
	"documents:write",
	"conversations:read",
	"conversations:write",
	"files:write",
];
const reconnect = "Run ryzome-mcp login to authorize Ryzome.";
const tokenResponse = z.object({
	access_token: z.string().min(1),
	refresh_token: z.string().min(1).optional(),
	token_type: z.string().regex(/^bearer$/i),
	expires_in: z.number().positive(),
	scope: z.string().optional(),
});
const grant = z.object({
	access: z.string(),
	refresh: z.string().optional(),
	spentRefresh: z.string().optional(),
	expires: z.number(),
	scope: z.string(),
	rotatingUntil: z.number().optional(),
});
type Grant = z.infer<typeof grant>;

async function post(endpoint: string, fields: Record<string, string>) {
	const response = await fetch(issuer + "/oauth2/" + endpoint, {
		method: "POST",
		body: new URLSearchParams(fields),
		redirect: "error",
		signal: AbortSignal.timeout(10000),
	});
	if (!response.ok)
		throw new Error(
			`Ryzome OAuth ${endpoint} returned HTTP ${response.status}.`,
		);
	return response;
}

async function exchange(
	fields: Record<string, string>,
	previousScope: string,
): Promise<Grant> {
	const response = await post("token", fields);
	const token = tokenResponse.parse(await response.json());
	return {
		access: token.access_token,
		refresh: token.refresh_token,
		expires: Date.now() + token.expires_in * 1000,
		scope: token.scope ?? previousScope,
	};
}

async function authorize(clientId: string) {
	const state = randomBytes(32).toString("base64url");
	const verifier = randomBytes(32).toString("base64url");
	const server = createServer();
	try {
		await new Promise<void>((resolve, reject) =>
			server.once("error", reject).listen(0, "127.0.0.1", resolve),
		);
		const address = server.address();
		if (!address || typeof address === "string")
			throw new Error("Missing callback port");
		const redirect = `http://127.0.0.1:${address.port}/oauth/callback`;
		const url = new URL(issuer + "/oauth2/authorize");
		url.search = new URLSearchParams({
			response_type: "code",
			prompt: "consent",
			client_id: clientId,
			redirect_uri: redirect,
			scope: scopes.join(" "),
			state,
			code_challenge_method: "S256",
			code_challenge: createHash("sha256").update(verifier).digest("base64url"),
		}).toString();
		const code = await new Promise<string>((resolve, reject) => {
			const timer = setTimeout(
				() => reject(new Error("Login timed out.")),
				300000,
			);
			server.once("close", () => clearTimeout(timer));
			let accepted = false;
			server.on("request", (req, res) => {
				res.setHeader("Content-Type", "text/plain; charset=utf-8");
				res.setHeader("Cache-Control", "no-store");
				const callback = URL.parse(req.url ?? "/", redirect);
				if (!callback) {
					res.writeHead(400).end("Invalid callback.");
					return;
				}
				const query = callback.searchParams;
				const matches = (name: string, value: string) =>
					query.getAll(name).length === 1 && query.get(name) === value;
				if (
					accepted ||
					req.method !== "GET" ||
					req.headers.host !== new URL(redirect).host ||
					callback.origin + callback.pathname !== redirect ||
					!matches("state", state) ||
					!matches("iss", issuer)
				) {
					res.writeHead(400).end("Invalid callback.");
					return;
				}
				accepted = true;
				const code = query.get("code");
				if (query.has("error") || !code || query.getAll("code").length !== 1) {
					res
						.writeHead(400)
						.end("Authorization declined or incomplete.", () =>
							reject(new Error("Authorization declined or incomplete.")),
						);
					return;
				}
				res.end("Return to your terminal to finish sign-in.", () =>
					resolve(code),
				);
			});
			console.error(
				"Open this link in a browser on this computer:\n" + url.href,
			);
		});
		return exchange(
			{
				grant_type: "authorization_code",
				client_id: clientId,
				redirect_uri: redirect,
				code,
				code_verifier: verifier,
			},
			scopes.join(" "),
		);
	} finally {
		server.close();
		server.closeAllConnections();
	}
}

// Keep one grant per production client ID. Compare-and-swap prevents a late
// rotation from replacing a newer login. Claim the refresh token durably
// before the network call so a crash cannot replay a spent token.
function store() {
	const dir = join(homedir(), ".ryzome-mcp");
	mkdirSync(dir, { mode: 0o700, recursive: true });
	const file = join(dir, "oauth.sqlite");
	if (process.platform === "win32") {
		closeSync(openSync(file, "a", 0o600));
	} else {
		const dirFd = openSync(dir, constants.O_DIRECTORY | constants.O_NOFOLLOW);
		try {
			fchmodSync(dirFd, 0o700);
		} finally {
			closeSync(dirFd);
		}
		const fd = openSync(
			file,
			constants.O_RDWR | constants.O_CREAT | constants.O_NOFOLLOW,
			0o600,
		);
		try {
			fchmodSync(fd, 0o600);
		} finally {
			closeSync(fd);
		}
	}
	const db = new DatabaseSync(file);
	db.exec(
		"PRAGMA busy_timeout=1000; PRAGMA secure_delete=ON; CREATE TABLE IF NOT EXISTS grants (client TEXT PRIMARY KEY, value TEXT NOT NULL)",
	);
	return db;
}

export async function accessToken(clientId: string): Promise<string> {
	const db = store();
	try {
		for (;;) {
			const row = db
				.prepare("SELECT value FROM grants WHERE client=?")
				.get(clientId);
			if (typeof row?.value !== "string") throw new Error(reconnect);
			const saved = grant.parse(JSON.parse(row.value));
			if (saved.rotatingUntil && saved.rotatingUntil > Date.now()) {
				await delay(125);
				continue;
			}
			if (saved.expires > Date.now() + 30000) return saved.access;
			if (!saved.refresh) throw new Error(reconnect);
			const claim = JSON.stringify({
				...saved,
				refresh: undefined,
				spentRefresh: saved.refresh,
				rotatingUntil: Date.now() + 15000,
			});
			const replace = db.prepare(
				"UPDATE grants SET value=? WHERE client=? AND value=?",
			);
			if (!replace.run(claim, clientId, row.value).changes) continue;
			let fresh: Grant;
			try {
				fresh = await exchange(
					{
						grant_type: "refresh_token",
						client_id: clientId,
						refresh_token: saved.refresh,
					},
					saved.scope,
				);
			} catch {
				replace.run(
					JSON.stringify({
						...saved,
						refresh: undefined,
						spentRefresh: saved.refresh,
					}),
					clientId,
					claim,
				);
				throw new Error("OAuth refresh failed. " + reconnect);
			}
			if (!fresh.refresh) fresh.spentRefresh = saved.refresh;
			try {
				if (replace.run(JSON.stringify(fresh), clientId, claim).changes)
					return fresh.access;
			} catch (error) {
				await revoke(clientId, fresh);
				throw error;
			}
			await revoke(clientId, fresh);
		}
	} finally {
		db.close();
	}
}

async function revoke(clientId: string, saved: Grant) {
	const refresh = saved.refresh ?? saved.spentRefresh;
	const tokens = [saved.access, ...(refresh ? [refresh] : [])];
	const results = await Promise.allSettled(
		tokens.map((token) => post("revoke", { client_id: clientId, token })),
	);
	if (results.some((r) => r.status === "rejected"))
		throw new Error(
			"Revocation incomplete. Disconnect the app in Ryzome Settings.",
		);
}

export async function oauthCommand(
	command: "login" | "logout",
	clientId: string,
) {
	const db = store();
	try {
		if (command === "logout") {
			const row = db
				.prepare("DELETE FROM grants WHERE client=? RETURNING value")
				.get(clientId);
			if (typeof row?.value === "string")
				await revoke(clientId, grant.parse(JSON.parse(row.value)));
			console.error("Signed out.");
			return;
		}
		const readPrevious = db.prepare("SELECT value FROM grants WHERE client=?");
		const saved = await authorize(clientId);
		if (!identity.every((s) => saved.scope.split(" ").includes(s))) {
			await revoke(clientId, saved);
			throw new Error("Ryzome API access requires openid, profile and email.");
		}

		let previous: ReturnType<typeof readPrevious.get>;
		try {
			db.exec("BEGIN IMMEDIATE");
			previous = readPrevious.get(clientId);
			db.prepare("INSERT OR REPLACE INTO grants VALUES (?,?)").run(
				clientId,
				JSON.stringify(saved),
			);
			db.exec("COMMIT");
		} catch (error) {
			try {
				if (db.isTransaction) db.exec("ROLLBACK");
			} finally {
				await revoke(clientId, saved);
			}
			throw error;
		}
		console.error("Signed in. Granted scopes: " + saved.scope);
		if (typeof previous?.value === "string") {
			try {
				await revoke(clientId, grant.parse(JSON.parse(previous.value)));
			} catch {
				console.error(
					"The new login is active. Ryzome could not confirm revocation of the previous tokens.",
				);
			}
		}
	} finally {
		db.close();
	}
}
