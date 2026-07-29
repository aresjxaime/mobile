import assert from 'assert';
import { spawn } from 'child_process';
import http from 'http';
import WebSocket from 'ws';
import path from 'path';

// Import repos directly (ts-node/register is used when running this file via npm test)
import { ConversationRepo } from '../src/data/conversation.ts';
import { DeviceRepo } from '../src/data/device.ts';

function wait(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function httpPost(pathname: string, token: string | null, body: any) {
  return new Promise<{status:number, body:any}>((resolve,reject)=>{
    const data = JSON.stringify(body);
    const opts: any = { hostname: '127.0.0.1', port: 3000, path: pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(opts, (res)=>{
      let b=''; res.on('data',c=> b+=c); res.on('end', ()=> { try{ resolve({status: res.statusCode||0, body: b ? JSON.parse(b) : null}); } catch(e){ reject(e);} });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('Starting tests...');
  // create conversation and device (persisted to .data)
  const conv = await ConversationRepo.createConversation('test-user', 'test-convo');
  const dev = await DeviceRepo.createDevice('test-device');
  const token = dev.token;
  console.log('Conversation', conv.id, 'Device token', token);

  // start server as a child process using ts-node register
  const node = spawn(process.execPath, ['-r','ts-node/register','src/server.ts'], { cwd: process.cwd(), stdio: ['ignore','pipe','pipe'] });
  node.stdout?.on('data', d=> process.stdout.write(`[server] ${d}`));
  node.stderr?.on('data', d=> process.stderr.write(`[server-err] ${d}`));

  // wait for server to start (allow more time on slower machines)
  await wait(1500);

  // connect websocket
  const ws = new WebSocket(`ws://127.0.0.1:3000/v1/realtime?token=${token}`);

  await new Promise<void>((resolve, reject)=>{
    const timeout = setTimeout(()=> reject(new Error('ws open timeout')), 5000);
    ws.on('open', ()=>{ clearTimeout(timeout); resolve(); });
    ws.on('error', reject);
  });
  console.log('WS connected');

  let received: any = null;

  ws.on('message', (data)=>{
    try{
      const obj = JSON.parse(data.toString());
      if (obj.type === 'subscribed') console.log('Subscribed ack', obj.conversationId);
      if (obj.type === 'message') { console.log('Received message via WS', obj.message.content); received = obj.message; }
    }catch(e){ }
  });

  // subscribe
  ws.send(JSON.stringify({ type: 'subscribe', conversationId: conv.id }));

  // post a message via HTTP
  const resp = await httpPost(`/v1/conversations/${conv.id}/messages`, token, { role: 'user', content: 'hello from phone' });
  assert.strictEqual(resp.status, 201, 'POST message should return 201');
  console.log('Posted message, server responded', resp.body.id);

  // wait for ws to receive broadcast
  let waited = 0;
  while(!received && waited < 5000) { await wait(100); waited += 100; }
  assert(received, 'Did not receive message over WS');
  assert.strictEqual(received.content, 'hello from phone');

  // cleanup
  ws.close();
  node.kill();
  console.log('Tests passed');
}

run().catch(e=>{ console.error('Tests failed', e); process.exit(1); });
