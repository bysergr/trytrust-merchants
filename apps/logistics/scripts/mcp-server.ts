import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLogisticsMcpServer } from '../lib/mcp/server';

async function runStdioServer() {
  const mcpServer = createLogisticsMcpServer();
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('[MCP Server] Logistics & Mobility (Rides, Packages, Freight) MCP server running over stdio...');
}

runStdioServer().catch((err) => {
  console.error('[MCP Server] Fatal error:', err);
  process.exit(1);
});
