import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createVuelaYaMcpServer } from '../lib/mcp/server';

async function runStdioServer() {
  const mcpServer = createVuelaYaMcpServer();
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('[MCP Server] Vuela Ya Colombian Domestic Airline MCP server running over stdio...');
}

runStdioServer().catch((err) => {
  console.error('[MCP Server] Fatal error:', err);
  process.exit(1);
}
);
