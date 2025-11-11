import { z } from "zod";
import { QuestDBClient } from "../questdb-client.js";
import { Logger } from "../logger.js";

/**
 * Query tool - Execute SELECT queries on QuestDB
 */
export function createQueryTool(client: QuestDBClient, logger: Logger) {
    return {
        name: "query",
        config: {
            title: "Query QuestDB",
            description:
                "Execute a SQL query on QuestDB and return the results. Supports SELECT queries only for safety.",
            inputSchema: {
                query: z.string().describe("The SQL query to execute (SELECT queries only)"),
                format: z.enum(["json", "csv"]).optional().default("json").describe("Output format for the query results"),
            },
            outputSchema: {
                dataset: z.array(z.any()).optional().describe("Query result dataset (for JSON format)"),
                query: z.string().optional().describe("The executed query"),
                count: z.number().optional().describe("Number of rows returned"),
                columns: z.array(z.string()).optional().describe("Column names"),
                error: z.string().optional().describe("Error message if query failed"),
            },
        },
        handler: async ({ query, format = "json" }: { query: string; format?: string }) => {
            try {
                const result = await client.query(query, format || "json");

                if (format === "json") {
                    const queryResult = result as any;
                    const structuredOutput = {
                        query,
                        dataset: queryResult.dataset || [],
                        count: queryResult.count || queryResult.dataset?.length || 0,
                        columns: queryResult.columns || [],
                    };

                    return {
                        content: [
                            {
                                type: "text" as const,
                                text: JSON.stringify(queryResult, null, 2),
                            },
                        ],
                        structuredContent: structuredOutput,
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text" as const,
                                text: result as string,
                            },
                        ],
                    };
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                await logger.error(`Query failed: ${errorMessage}`, { query });
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: `Error: ${errorMessage}`,
                        },
                    ],
                    isError: true,
                };
            }
        },
    };
}

