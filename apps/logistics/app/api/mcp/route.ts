import { createMcpHandler } from 'mcp-handler';
import { registerMcpTools } from '@/lib/mcp/server';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, x-mcp-session-id, *',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, x-mcp-session-id',
  'Access-Control-Max-Age': '86400',
};

const internalMcpHandler = createMcpHandler(
  async (server) => {
    registerMcpTools(server);
  },
  {
    serverInfo: {
      name: 'logistics-mcp',
      version: '1.0.0',
    },
  }
);

async function handleMcpRequest(req: NextRequest | Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Handle GET health check and discovery probes
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        status: 'ok',
        name: 'logistics-mcp',
        version: '1.0.0',
        description: 'Logistics & Mobility MCP Server (Rides, Packages, Freight)',
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: true },
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Ensure request headers contain required Accept header for MCP transport
  const headers = new Headers(req.headers);
  const currentAccept = headers.get('accept') || '';
  if (!currentAccept.includes('text/event-stream') || !currentAccept.includes('application/json')) {
    headers.set('accept', 'application/json, text/event-stream, */*');
  }

  // Clone body if POST
  let bodyBuffer: ArrayBuffer | undefined;
  if (req.method === 'POST') {
    try {
      bodyBuffer = await req.clone().arrayBuffer();
    } catch {
      // ignore
    }
  }

  const normalizedReq = new Request(req.url, {
    method: req.method,
    headers,
    body: bodyBuffer,
    // @ts-expect-error duplex required in Node.js runtime
    duplex: 'half',
  });

  try {
    const res = await internalMcpHandler(normalizedReq);
    const responseHeaders = new Headers(res.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(key, value);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[MCP Route Handler Error]:', error);
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal MCP server error',
        },
        id: null,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const OPTIONS = handleMcpRequest;
