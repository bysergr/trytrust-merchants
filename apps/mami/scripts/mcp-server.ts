import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createStoreMcpServer } from '../lib/mcp/server';

async function runStdioServer() {
  const mcpServer = createStoreMcpServer();
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('[MCP Server] Mami Store MCP server running over stdio...');
}

runStdioServer().catch((err) => {
  console.error('[MCP Server] Fatal error:', err);
  process.exit(1);
});
