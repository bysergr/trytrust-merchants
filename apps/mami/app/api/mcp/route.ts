import { createMcpHandler } from 'mcp-handler';
import { registerMcpTools } from '@/lib/mcp/server';

const handler = createMcpHandler(
  async (server) => {
    registerMcpTools(server);
  },
  {
    serverInfo: {
      name: 'mami-store-mcp',
      version: '1.0.0',
    },
  }
);

export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
