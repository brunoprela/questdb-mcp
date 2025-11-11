/**
 * Configuration interface for QuestDB connection
 */
export interface QuestDBConfig {
    host: string;
    port: number;
    username?: string;
    password?: string;
    autoFlushRows?: number;
    autoFlushInterval?: number;
}

/**
 * Query result structure from QuestDB
 */
export interface QueryResult {
    dataset?: any[][];
    count?: number;
    columns?: string[];
    query?: string;
    [key: string]: any;
}

