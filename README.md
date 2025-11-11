# QuestDB MCP Server

A Model Context Protocol (MCP) server for QuestDB that enables AI assistants to interact with QuestDB databases through tools for querying and inserting data.

## Features

- **Query Execution**: Execute SELECT queries on QuestDB tables with structured output
- **Data Insertion**: Insert data into QuestDB tables using the InfluxDB Line Protocol
- **Table Management**: List tables and describe table schemas
- **Automatic Schema Creation**: Tables and columns are created automatically on insert
- **Type Safety**: Full TypeScript support with Zod schema validation
- **Structured Output**: All tools return structured content with output schemas
- **MCP Logging**: Integrated MCP logging messages for better observability
- **Error Handling**: Comprehensive error handling with graceful degradation
- **Server Instructions**: Built-in server instructions for AI assistants
- **Graceful Shutdown**: Proper cleanup on SIGINT/SIGTERM signals

## Prerequisites

- Node.js v16 or newer
- QuestDB instance running (see [QuestDB Quick Start](https://questdb.io/docs/getting-started/))

## Installation

### As a Package

Install from npm:

```bash
npm install questdb-mcp
```

**Note:** This package is publicly available on npm. No authentication or configuration is required to install or use it.

### From Source

1. Clone this repository or navigate to the project directory:
   ```bash
   cd questdb-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Configuration

The server can be configured using environment variables:

- `QUESTDB_HOST` - QuestDB host (default: `localhost`)
- `QUESTDB_PORT` - QuestDB port (default: `9000`)
- `QUESTDB_USERNAME` - QuestDB username (optional, for authentication)
- `QUESTDB_PASSWORD` - QuestDB password (optional, for authentication)
- `QUESTDB_AUTO_FLUSH_ROWS` - Auto-flush after N rows (optional)
- `QUESTDB_AUTO_FLUSH_INTERVAL` - Auto-flush interval in milliseconds (optional)

## Usage

This package can be used in two ways:

### 1. CLI Usage

Run the MCP server directly:

```bash
npm start
```

Or for development:

```bash
npm run dev
```

Or install globally:

```bash
npm install -g questdb-mcp
questdb-mcp
```

### 2. Library Usage

Install as a dependency in your TypeScript project:

```bash
npm install questdb-mcp
```

#### Basic Usage

```typescript
import { QuestDBMCPServer, loadConfig } from 'questdb-mcp';

// Load configuration from environment variables
const config = loadConfig();

// Create server instance
const server = new QuestDBMCPServer(config);

// Start the server
await server.run();
```

#### Custom Configuration

```typescript
import { QuestDBMCPServer, QuestDBConfig } from 'questdb-mcp';

const config: QuestDBConfig = {
  host: 'localhost',
  port: 9000,
  username: 'admin',
  password: 'quest',
};

const server = new QuestDBMCPServer(config, {
  setupProcessHandlers: false, // Don't set up process handlers when using as library
  serverName: 'my-questdb-server',
  serverVersion: '1.0.0',
  instructions: 'Custom server instructions...',
});

await server.run();
```

#### Using with Custom Transport

```typescript
import { QuestDBMCPServer, QuestDBConfig } from 'questdb-mcp';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';

const config: QuestDBConfig = {
  host: 'localhost',
  port: 9000,
};

const server = new QuestDBMCPServer(config, {
  setupProcessHandlers: false,
});

const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on('close', () => {
    transport.close();
  });

  await server.server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(3000, () => {
  console.log('MCP server running on http://localhost:3000/mcp');
});
```

#### Accessing Internal Components

```typescript
import { QuestDBMCPServer } from 'questdb-mcp';

const server = new QuestDBMCPServer(config);

// Access the underlying MCP server
const mcpServer = server.server;

// Access the QuestDB client
const client = server.questDBClient;

// Access the logger
const logger = server.log;

// Use the client directly
const tables = await client.listTables();
const result = await client.query('SELECT * FROM my_table LIMIT 10');

// Use the logger
await logger.info('Custom log message', { metadata: 'value' });
```

#### Creating Custom Tools

```typescript
import { QuestDBMCPServer, QuestDBConfig } from 'questdb-mcp';
import { z } from 'zod';

const config: QuestDBConfig = {
  host: 'localhost',
  port: 9000,
};

const server = new QuestDBMCPServer(config, {
  setupProcessHandlers: false,
});

// Access the underlying MCP server to register custom tools
server.server.registerTool(
  'my-custom-tool',
  {
    title: 'My Custom Tool',
    description: 'A custom tool that uses QuestDB',
    inputSchema: {
      param: z.string().describe('A parameter'),
    },
  },
  async ({ param }) => {
    // Use the QuestDB client
    const client = server.questDBClient;
    const result = await client.query(`SELECT * FROM my_table WHERE col = '${param}'`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

await server.run();
```

#### Shutdown

```typescript
// Gracefully shutdown the server
await server.shutdown();
```

#### TypeScript Types

All types are exported and available for use:

```typescript
import type {
  QuestDBConfig,
  QueryResult,
  QuestDBMCPServerOptions,
} from 'questdb-mcp';
```

### Available Tools

#### 1. `query`

Execute a SQL SELECT query on QuestDB.

**Parameters:**
- `query` (string, required): The SQL query to execute (SELECT queries only)
- `format` (string, optional): Output format - `json` or `csv` (default: `json`)

**Example:**
```json
{
  "query": "SELECT * FROM trades LIMIT 10",
  "format": "json"
}
```

#### 2. `insert`

Insert data into a QuestDB table. Tables and columns are created automatically if they don't exist.

**Parameters:**
- `table` (string, required): The name of the table to insert into
- `data` (object, required): An object containing the data to insert
  - Keys are column names
  - Values are the data (strings, numbers, booleans)
  - Use `timestamp` key for explicit timestamp (milliseconds since epoch)
  - If `timestamp` is not provided, the current time is used

**Example:**
```json
{
  "table": "trades",
  "data": {
    "symbol": "ETH-USD",
    "side": "sell",
    "price": 2615.54,
    "amount": 0.00044,
    "timestamp": 1699123456789
  }
}
```

#### 3. `list_tables`

List all tables in the QuestDB database.

**Parameters:** None

#### 4. `describe_table`

Get the schema of a specific table.

**Parameters:**
- `table` (string, required): The name of the table to describe

**Example:**
```json
{
  "table": "trades"
}
```

## QuestDB Setup

### Quick Start with Docker

```bash
docker run \
  -p 9000:9000 -p 9009:9009 -p 8812:8812 -p 9003:9003 \
  questdb/questdb:9.1.1
```

### Quick Start with Homebrew (macOS)

```bash
brew install questdb
```

The QuestDB Web Console will be available at: http://localhost:9000

## Development

### Building

```bash
npm run build
```

### Type Checking

```bash
npm run typecheck
```

### Development Mode

```bash
npm run dev
```

## Data Types

The insert tool automatically maps JavaScript types to QuestDB types:

- **String** → `SYMBOL` (indexed string type)
- **Number (integer)** → `LONG`
- **Number (float)** → `DOUBLE`
- **Boolean** → `BOOLEAN`
- **Timestamp** → `TIMESTAMP` (when using the `timestamp` field)

## Security Notes

- Only SELECT queries are allowed through the `query` tool for safety
- The server uses the QuestDB REST API for queries and the InfluxDB Line Protocol for inserts
- Authentication is supported via username/password if your QuestDB instance requires it

## Examples

### Inserting Trade Data

```json
{
  "tool": "insert",
  "arguments": {
    "table": "trades",
    "data": {
      "symbol": "BTC-USD",
      "side": "buy",
      "price": 39269.98,
      "amount": 0.001
    }
  }
}
```

### Querying Data

```json
{
  "tool": "query",
  "arguments": {
    "query": "SELECT symbol, price, amount FROM trades WHERE symbol = 'BTC-USD' ORDER BY timestamp DESC LIMIT 10"
  }
}
```

### Listing Tables

```json
{
  "tool": "list_tables",
  "arguments": {}
}
```

## License

MIT

## Resources

- [QuestDB Documentation](https://questdb.io/docs/)
- [QuestDB Node.js Client](https://questdb.io/docs/clients/ingest-node/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

