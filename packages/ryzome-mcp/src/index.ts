#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRyzomeMcpServer } from "./server.js";

const command = process.argv[2];
if (command === "login" || command === "logout") {
	const id = process.env.RYZOME_OAUTH_CLIENT_ID?.trim();
	if (!id)
		throw new Error(
			"Set RYZOME_OAUTH_CLIENT_ID to your registered production client ID.",
		);
	const { oauthCommand } = await import("./oauth.js");
	await oauthCommand(command, id);
} else {
	const server = createRyzomeMcpServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
}
