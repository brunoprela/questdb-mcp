import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Logger utility for MCP server
 * Provides structured logging that integrates with MCP's logging system
 */
export class Logger {
    constructor(private mcpServer: McpServer) { }

    /**
     * Log an info message
     */
    async info(message: string, metadata?: Record<string, unknown>): Promise<void> {
        try {
            // Only send logging message if server is connected
            if (this.mcpServer.isConnected()) {
                await this.mcpServer.server.sendLoggingMessage({
                    level: "info",
                    data: metadata ? { message, ...metadata } : { message },
                });
            } else {
                // Fallback to console if not connected
                console.error("[Info]", message, metadata || "");
            }
        } catch (error) {
            // Fallback to console if logging fails
            console.error("[Info]", message, metadata || "");
        }
    }

    /**
     * Log an error message
     */
    async error(message: string, metadata?: Record<string, unknown>): Promise<void> {
        try {
            // Only send logging message if server is connected
            if (this.mcpServer.isConnected()) {
                await this.mcpServer.server.sendLoggingMessage({
                    level: "error",
                    data: metadata ? { message, ...metadata } : { message },
                });
            } else {
                // Fallback to console if not connected
                console.error("[Error]", message, metadata || "");
            }
        } catch (error) {
            // Fallback to console if logging fails
            console.error("[Error]", message, metadata || "");
        }
    }
}

