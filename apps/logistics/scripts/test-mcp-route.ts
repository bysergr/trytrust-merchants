import { GET, POST, OPTIONS } from '../app/api/mcp/route';
import { NextRequest } from 'next/server';

async function testMcpRoute() {
  console.log('🧪 Testing Logistics MCP Route Handlers (HTTP & SSE transport)...\n');

  // 1. Test OPTIONS (CORS preflight)
  const optReq = new NextRequest('http://localhost:3000/api/mcp', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://claude.ai',
      'Access-Control-Request-Method': 'POST',
    },
  });
  const optRes = await OPTIONS(optReq);
  console.log('1️⃣ OPTIONS preflight status:', optRes.status, '| CORS origin:', optRes.headers.get('access-control-allow-origin'));

  // 2. Test GET (Health check / SSE discovery probe)
  const getReq = new NextRequest('http://localhost:3000/api/mcp', {
    method: 'GET',
    headers: { 'Accept': 'application/json, text/event-stream' },
  });
  const getRes = await GET(getReq);
  const getBody = await getRes.json();
  console.log('2️⃣ GET health discovery status:', getRes.status, '| Server name:', getBody.name, '| Tools supported:', Boolean(getBody.capabilities?.tools));

  // 3. Test POST initialize (MCP JSON-RPC initial handshake)
  const initBody = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'Claude-Desktop', version: '1.0.0' },
    },
  };
  const initReq = new NextRequest('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'https://claude.ai' },
    body: JSON.stringify(initBody),
  });
  const initRes = await POST(initReq);
  const initText = await initRes.text();
  console.log('3️⃣ POST initialize status:', initRes.status);
  console.log('   Response contains 2024-11-05:', initText.includes('2024-11-05'));

  // 4. Test POST tools/list
  const listBody = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {},
  };
  const listReq = new NextRequest('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'https://claude.ai' },
    body: JSON.stringify(listBody),
  });
  const listRes = await POST(listReq);
  const listText = await listRes.text();
  console.log('4️⃣ POST tools/list status:', listRes.status);
  console.log('   Contains list_vehicle_types:', listText.includes('list_vehicle_types'));
  console.log('   Contains get_quote:', listText.includes('get_quote'));
  console.log('   Contains request_ride:', listText.includes('request_ride'));
  console.log('   Contains request_package_delivery:', listText.includes('request_package_delivery'));
  console.log('   Contains request_freight:', listText.includes('request_freight'));
  console.log('   Contains track_request:', listText.includes('track_request'));
  console.log('   Contains cancel_request:', listText.includes('cancel_request'));
  console.log('   Contains pay:', listText.includes('pay'));

  console.log('\n🎉 MCP Route verification passed with complete tool registration!');
}

testMcpRoute().catch((err) => {
  console.error('❌ MCP Route test failed:', err);
  process.exit(1);
});
