import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { QuestDBConfig } from "./types.js";
import { QuestDBClient } from "./questdb-client.js";
import { Logger } from "./logger.js";
import { registerTools } from "./tools/index.js";

/**
 * Options for QuestDBMCPServer
 */
export interface QuestDBMCPServerOptions {
    /**
     * Whether to set up process signal handlers (SIGINT, SIGTERM, etc.)
     * Defaults to true. Set to false when using as a library.
     */
    setupProcessHandlers?: boolean;
    
    /**
     * Custom server name
     * Defaults to "questdb-mcp"
     */
    serverName?: string;
    
    /**
     * Custom server version
     * Defaults to "1.0.0"
     */
    serverVersion?: string;
    
    /**
     * Custom server instructions
     * If not provided, uses default instructions
     */
    instructions?: string;
}

/**
 * Main MCP server class that orchestrates the QuestDB MCP server
 */
export class QuestDBMCPServer {
    private mcpServer: McpServer;
    private client: QuestDBClient;
    private logger: Logger;
    private config: QuestDBConfig;
    private transport: StdioServerTransport | null = null;
    private setupProcessHandlers: boolean;

    constructor(config: QuestDBConfig, options: QuestDBMCPServerOptions = {}) {
        this.config = config;
        this.setupProcessHandlers = options.setupProcessHandlers ?? true;
        
        const serverName = options.serverName || "questdb-mcp";
        const serverVersion = options.serverVersion || "1.0.0";
        const instructions = options.instructions || `QuestDB MCP Server provides tools to interact with QuestDB time-series database.
                
Available tools:
- query: Execute SELECT queries on QuestDB tables
- insert: Insert data into QuestDB tables using InfluxDB Line Protocol
- list_tables: List all tables in the database
- describe_table: Get the schema of a specific table

The server automatically creates tables and columns when inserting data. All queries are read-only (SELECT only) for safety.`;

        this.mcpServer = new McpServer(
            {
                name: serverName,
                version: serverVersion,
            },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                },
                instructions,
            }
        );

        this.logger = new Logger(this.mcpServer);
        this.client = new QuestDBClient(config, this.logger);

        this.setupTools();
        if (this.setupProcessHandlers) {
            this.setupErrorHandling();
        }
    }

    /**
     * Register all tools with the MCP server
     */
    private setupTools(): void {
        registerTools(this.mcpServer, this.client, this.logger);
    }

    /**
     * Setup error handling for the server
     */
    private setupErrorHandling(): void {
        // Handle server-level errors
        this.mcpServer.server.onerror = (error) => {
            console.error("[MCP Server Error]", error);
        };

        // Handle transport errors
        process.on("SIGINT", async () => {
            await this.shutdown();
        });

        process.on("SIGTERM", async () => {
            await this.shutdown();
        });

        // Handle uncaught errors
        process.on("uncaughtException", async (error) => {
            console.error("[Uncaught Exception]", error);
            await this.shutdown();
            process.exit(1);
        });

        process.on("unhandledRejection", async (reason, promise) => {
            console.error("[Unhandled Rejection]", reason, "at", promise);
        });
    }

    /**
     * Shutdown the server and cleanup resources
     */
    async shutdown(): Promise<void> {
        try {
            // Log shutdown (may fail if server disconnected, that's OK)
            this.logger.info("Shutting down QuestDB MCP server").catch(() => {
                // Ignore logging errors during shutdown
            });
            await this.client.close();
            if (this.transport && this.mcpServer.isConnected()) {
                await this.mcpServer.close();
            }
        } catch (error) {
            console.error("Error during shutdown:", error);
        }
    }
    
    /**
     * Get the underlying MCP server instance
     * Useful for advanced use cases
     */
    get server(): McpServer {
        return this.mcpServer;
    }
    
    /**
     * Get the QuestDB client instance
     * Useful for custom tool implementations
     */
    get questDBClient(): QuestDBClient {
        return this.client;
    }
    
    /**
     * Get the logger instance
     * Useful for custom tool implementations
     */
    get log(): Logger {
        return this.logger;
    }

    /**
     * Start the MCP server
     */
    async run(): Promise<void> {
        try {
            this.transport = new StdioServerTransport();

            // Handle transport errors
            this.transport.onerror = (error) => {
                console.error("[Transport Error]", error);
            };

            this.transport.onclose = () => {
                console.error("Transport closed");
            };

            await this.mcpServer.connect(this.transport);
            await this.logger.info("QuestDB MCP server started", {
                host: this.config.host,
                port: this.config.port,
            });
            console.error("QuestDB MCP server running on stdio");
        } catch (error) {
            console.error("Failed to start server:", error);
            process.exit(1);
        }
    }
}

