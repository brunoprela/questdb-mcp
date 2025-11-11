/**
 * Library exports for QuestDB MCP Server
 * 
 * This module exports the main classes and types that can be used
 * to integrate QuestDB MCP server into other TypeScript projects.
 */

// Export main server class and options
export { QuestDBMCPServer, type QuestDBMCPServerOptions } from "./server.js";

// Export configuration types and utilities
export { type QuestDBConfig, type QueryResult } from "./types.js";
export { loadConfig } from "./config.js";

// Export QuestDB client (useful for custom implementations)
export { QuestDBClient } from "./questdb-client.js";

// Export logger (useful for custom implementations)
export { Logger } from "./logger.js";

