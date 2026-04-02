#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRyzomeMcpServer } from "./server.js";

const server = createRyzomeMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
