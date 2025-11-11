import { QuestDBConfig } from "./types.js";

/**
 * Loads QuestDB configuration from environment variables
 */
export function loadConfig(): QuestDBConfig {
    return {
        host: process.env.QUESTDB_HOST || "localhost",
        port: parseInt(process.env.QUESTDB_PORT || "9000", 10),
        username: process.env.QUESTDB_USERNAME,
        password: process.env.QUESTDB_PASSWORD,
        autoFlushRows: process.env.QUESTDB_AUTO_FLUSH_ROWS
            ? parseInt(process.env.QUESTDB_AUTO_FLUSH_ROWS, 10)
            : undefined,
        autoFlushInterval: process.env.QUESTDB_AUTO_FLUSH_INTERVAL
            ? parseInt(process.env.QUESTDB_AUTO_FLUSH_INTERVAL, 10)
            : undefined,
    };
}

