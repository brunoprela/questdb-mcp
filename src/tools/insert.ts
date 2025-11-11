import { z } from "zod";
import { QuestDBClient } from "../questdb-client.js";
import { Logger } from "../logger.js";

/**
 * Insert tool - Insert data into QuestDB tables
 */
export function createInsertTool(client: QuestDBClient, logger: Logger) {
    return {
        name: "insert",
        config: {
            title: "Insert Data into QuestDB",
            description:
                "Insert data into a QuestDB table using the InfluxDB Line Protocol. Automatically creates tables and columns if they don't exist.",
            inputSchema: {
                table: z.string().describe("The name of the table to insert into"),
                data: z.record(z.unknown()).describe(
                    "An object containing the data to insert. Keys are column names, values are the data. Use 'timestamp' key for explicit timestamp (milliseconds since epoch)."
                ),
            },
            outputSchema: {
                success: z.boolean().describe("Whether the insert was successful"),
                table: z.string().describe("The table name"),
                message: z.string().describe("Status message"),
            },
        },
        handler: async ({ table, data }: { table: string; data: Record<string, any> }) => {
            try {
                await client.insert(table, data);
                const output = {
                    success: true,
                    table,
                    message: `Successfully inserted data into table '${table}'`,
                };
                await logger.info(`Inserted data into table '${table}'`);
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: output.message,
                        },
                    ],
                    structuredContent: output,
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                await logger.error(`Insert failed: ${errorMessage}`, { table });
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

