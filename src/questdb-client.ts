import { Sender } from "@questdb/nodejs-client";
import { QuestDBConfig, QueryResult } from "./types.js";
import { Logger } from "./logger.js";

/**
 * QuestDB client wrapper that manages connections and provides
 * high-level methods for querying and inserting data
 */
export class QuestDBClient {
    private sender: Sender | null = null;
    private config: QuestDBConfig;
    private logger: Logger;

    constructor(config: QuestDBConfig, logger: Logger) {
        this.config = config;
        this.logger = logger;
    }

    /**
     * Get or create the QuestDB sender instance
     */
    private async getSender(): Promise<Sender> {
        if (!this.sender) {
            const configString = this.buildConfigString();
            this.sender = await Sender.fromConfig(configString);
            // Log initialization (may fail if server not connected yet, that's OK)
            this.logger.info("QuestDB sender initialized", {
                host: this.config.host,
                port: this.config.port,
            }).catch(() => {
                // Ignore logging errors during initialization
            });
        }
        return this.sender;
    }

    /**
     * Build QuestDB client configuration string
     */
    private buildConfigString(): string {
        let config = `http::addr=${this.config.host}:${this.config.port}`;

        if (this.config.username && this.config.password) {
            config += `;username=${this.config.username};password=${this.config.password}`;
        }

        if (this.config.autoFlushRows) {
            config += `;auto_flush_rows=${this.config.autoFlushRows}`;
        }

        if (this.config.autoFlushInterval) {
            config += `;auto_flush_interval=${this.config.autoFlushInterval}`;
        }

        return config;
    }

    /**
     * Execute a SELECT query on QuestDB
     * @param query - SQL SELECT query
     * @param format - Output format (json or csv)
     * @returns Query result (QueryResult for json, string for csv)
     */
    async query(query: string, format: string = "json"): Promise<QueryResult | string> {
        // Basic safety check - only allow SELECT queries
        const trimmedQuery = query.trim().toUpperCase();
        if (!trimmedQuery.startsWith("SELECT")) {
            throw new Error("Only SELECT queries are allowed for safety reasons");
        }

        const url = new URL(`http://${this.config.host}:${this.config.port}/exec`);
        url.searchParams.append("query", query);
        url.searchParams.append("fmt", format);

        const authHeader =
            this.config.username && this.config.password
                ? `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64")}`
                : undefined;

        const response = await fetch(url.toString(), {
            method: "GET",
            headers: authHeader ? { Authorization: authHeader } : {},
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Query failed: ${response.status} ${response.statusText}. ${errorText}`);
        }

        if (format === "json") {
            const result = await response.json();
            return result as QueryResult;
        } else {
            return await response.text();
        }
    }

    /**
     * Insert data into a QuestDB table
     * @param table - Table name
     * @param data - Data to insert (object with column names as keys)
     */
    async insert(table: string, data: Record<string, any>): Promise<void> {
        const sender = await this.getSender();

        // Extract timestamp if provided
        const timestamp = data.timestamp !== undefined
            ? (typeof data.timestamp === "number" ? data.timestamp : Date.parse(data.timestamp))
            : undefined;

        // Remove timestamp from data so it's not added as a column
        const { timestamp: _, ...columnData } = data;

        // Start building the row
        const rowBuilder = sender.table(table);

        // Add all columns
        for (const [key, value] of Object.entries(columnData)) {
            if (value === null || value === undefined) {
                continue;
            }

            const valueType = typeof value;

            if (valueType === "string") {
                // Try to determine if it's a symbol or regular string
                // For simplicity, treat all strings as symbols for now
                // In a real implementation, you might want to check table schema
                rowBuilder.symbol(key, value);
            } else if (valueType === "number") {
                // Check if it's an integer or float
                if (Number.isInteger(value)) {
                    rowBuilder.intColumn(key, value);
                } else {
                    rowBuilder.floatColumn(key, value);
                }
            } else if (valueType === "boolean") {
                rowBuilder.booleanColumn(key, value);
            } else {
                // Convert to string for other types
                rowBuilder.symbol(key, String(value));
            }
        }

        // Close the row with timestamp (or use current time)
        if (timestamp !== undefined) {
            await rowBuilder.at(timestamp, "ms");
        } else {
            await rowBuilder.atNow();
        }

        await sender.flush();
    }

    /**
     * List all tables in the database
     * @returns Array of table names
     */
    async listTables(): Promise<string[]> {
        const query = "SELECT table_name FROM tables() ORDER BY table_name";
        const result = await this.query(query, "json") as QueryResult;

        // Parse the result and format it nicely
        if (result && result.dataset && Array.isArray(result.dataset)) {
            return result.dataset.map((row: any) => row[0]);
        }

        return [];
    }

    /**
     * Get the schema of a specific table
     * @param table - Table name
     * @returns Table schema information
     */
    async describeTable(table: string): Promise<QueryResult> {
        // Sanitize table name to prevent SQL injection
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
            throw new Error(`Invalid table name: ${table}`);
        }

        const query = `SELECT * FROM table_columns('${table}')`;
        return await this.query(query, "json") as QueryResult;
    }

    /**
     * Close the QuestDB connection and cleanup resources
     */
    async close(): Promise<void> {
        if (this.sender) {
            try {
                await this.sender.flush();
                await this.sender.close();
                // Log cleanup (may fail if server disconnected, that's OK)
                this.logger.info("QuestDB connection closed").catch(() => {
                    // Ignore logging errors during cleanup
                });
            } catch (error) {
                console.error("Error closing QuestDB connection:", error);
            }
            this.sender = null;
        }
    }
}

