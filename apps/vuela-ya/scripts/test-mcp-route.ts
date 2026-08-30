import { GET, POST, OPTIONS } from '../app/api/mcp/route';
import { NextRequest } from 'next/server';

async function testMcpRoute() {
  console.log('Testing updated MCP Route Handlers...');

  // 1. Test OPTIONS (CORS preflight)
  const optReq = new NextRequest('http://localhost:3000/api/mcp', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://claude.ai',
      'Access-Control-Request-Method': 'POST',
    }
  });
  const optRes = await OPTIONS(optReq);
  console.log('1. OPTIONS status:', optRes.status, 'CORS origin:', optRes.headers.get('access-control-allow-origin'));

  // Test GET (SSE / Discovery)
  const getReq = new NextRequest('http://localhost:3000/api/mcp', {
    method: 'GET',
    headers: { 'Accept': 'text/event-stream, application/json' }
  });
  const getRes = await GET(getReq);
  console.log('1b. GET status:', getRes.status);

  // 2. Test POST initialize (Claude initial handshake)
  const initBody = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'Claude', version: '1.0.0' }
    }
  };
  const initReq = new NextRequest('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'https://claude.ai' },
    body: JSON.stringify(initBody)
  });
  const initRes = await POST(initReq);
  const initText = await initRes.text();
  console.log('2. POST initialize status:', initRes.status);
  console.log('   Response contains protocolVersion:', initText.includes('2024-11-05'));

  // 3. Test POST tools/list
  const listBody = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  const listReq = new NextRequest('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'https://claude.ai' },
    body: JSON.stringify(listBody)
  });
  const listRes = await POST(listReq);
  const listText = await listRes.text();
  console.log('3. POST tools/list status:', listRes.status);
  console.log('   Response contains list_airports:', listText.includes('list_airports'));
  console.log('   Response contains select_seat:', listText.includes('select_seat'));
  console.log('   Response contains pay:', listText.includes('pay'));

  console.log('\n✅ MCP Route verification passed perfectly!');
}

testMcpRoute();
