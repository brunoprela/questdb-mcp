import { z } from "zod";
import { QuestDBClient } from "../questdb-client.js";
import { Logger } from "../logger.js";

/**
 * Describe table tool - Get table schema information
 */
export function createDescribeTableTool(client: QuestDBClient, logger: Logger) {
    return {
        name: "describe_table",
        config: {
            title: "Describe QuestDB Table Schema",
            description: "Get the schema of a specific table",
            inputSchema: {
                table: z.string().describe("The name of the table to describe"),
            },
            outputSchema: {
                table: z.string().describe("The table name"),
                columns: z.array(z.any()).optional().describe("Table column information"),
                error: z.string().optional().describe("Error message if table doesn't exist"),
            },
        },
        handler: async ({ table }: { table: string }) => {
            try {
                const result = await client.describeTable(table);
                const output = {
                    table,
                    columns: result.dataset || result,
                };
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                    structuredContent: output,
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                await logger.error(`Describe table failed: ${errorMessage}`, { table });
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

