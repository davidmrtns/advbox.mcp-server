import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { registerMcpTools } from './wrappers/tool.wrapper.js';
import './tools/index.js';

const MCP_SERVER_NAME = 'mcp-server';
const MCP_SERVER_VERSION = '1.0.0';

const logger = {
  error: (message: string, error?: unknown) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message,
        ...(error instanceof Error
          ? { error: { name: error.name, message: error.message } }
          : error !== undefined
            ? { error: String(error) }
            : {}),
      }),
    );
  },
};

const handler = createMcpHandler(
  () => {
    const server = new McpServer({
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    });

    registerMcpTools(server);

    return server;
  },
  {
    onerror: (error) => logger.error('MCP handler error', error),
  },
);

export default handler;
