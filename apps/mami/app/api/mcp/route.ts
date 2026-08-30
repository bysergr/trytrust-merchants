import { NextRequest } from 'next/server';
import { createMcpHandler } from 'mcp-handler';
import { registerMcpTools } from '@/lib/mcp/server';

const baseHandler = createMcpHandler(
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Mcp-Session-Id, x-mcp-session-id',
  'Access-Control-Max-Age': '86400',
};

async function handleMcpRequest(req: NextRequest): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Ensure accept header satisfies MCP SDK requirement for Streamable HTTP / SSE
  const headers = new Headers(req.headers);
  const currentAccept = headers.get('accept') || '';
  if (!currentAccept.includes('text/event-stream') || !currentAccept.includes('application/json')) {
    headers.set('accept', 'application/json, text/event-stream');
  }

  const modifiedReq = new Request(req.url, {
    method: req.method,
    headers: headers,
    body: req.body,
    // @ts-expect-error duplex is required in Node fetch for streaming bodies
    duplex: 'half',
  });

  try {
    const response = await baseHandler(modifiedReq);

    // Attach CORS headers to response
    const respHeaders = new Headers(response.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      respHeaders.set(k, v);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: respHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal MCP Handler Error';
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32603, message },
        id: null,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const OPTIONS = handleMcpRequest;
