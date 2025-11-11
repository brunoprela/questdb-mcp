#!/usr/bin/env node

import { QuestDBMCPServer } from "./server.js";
import { loadConfig } from "./config.js";

/**
 * CLI entry point for the QuestDB MCP server
 */
async function main() {
    const config = loadConfig();
    const server = new QuestDBMCPServer(config);
    await server.run();
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});

