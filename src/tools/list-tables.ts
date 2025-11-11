import { z } from "zod";
import { QuestDBClient } from "../questdb-client.js";
import { Logger } from "../logger.js";

/**
 * List tables tool - List all tables in the database
 */
export function createListTablesTool(client: QuestDBClient, logger: Logger) {
    return {
        name: "list_tables",
        config: {
            title: "List QuestDB Tables",
            description: "List all tables in the QuestDB database",
            inputSchema: {},
            outputSchema: {
                tables: z.array(z.string()).describe("List of table names"),
                count: z.number().describe("Number of tables"),
            },
        },
        handler: async () => {
            try {
                const tables = await client.listTables();
                const output = {
                    tables,
                    count: tables.length,
                };
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: JSON.stringify(output, null, 2),
                        },
                    ],
                    structuredContent: output,
                };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                await logger.error(`List tables failed: ${errorMessage}`);
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

