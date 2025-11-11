import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { QuestDBClient } from "../questdb-client.js";
import { Logger } from "../logger.js";
import { createQueryTool } from "./query.js";
import { createInsertTool } from "./insert.js";
import { createListTablesTool } from "./list-tables.js";
import { createDescribeTableTool } from "./describe-table.js";

/**
 * Register all tools with the MCP server
 */
export function registerTools(server: McpServer, client: QuestDBClient, logger: Logger): void {
    // Register query tool
    const queryTool = createQueryTool(client, logger);
    server.registerTool(queryTool.name, queryTool.config, queryTool.handler);

    // Register insert tool
    const insertTool = createInsertTool(client, logger);
    server.registerTool(insertTool.name, insertTool.config, insertTool.handler);

    // Register list tables tool
    const listTablesTool = createListTablesTool(client, logger);
    server.registerTool(listTablesTool.name, listTablesTool.config, listTablesTool.handler);

    // Register describe table tool
    const describeTableTool = createDescribeTableTool(client, logger);
    server.registerTool(describeTableTool.name, describeTableTool.config, describeTableTool.handler);
}

