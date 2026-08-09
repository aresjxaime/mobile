import http from 'http';
import url from 'url';
import { ConversationService } from './services/conversationService.ts';
import { DeviceService } from './services/deviceService.ts';
import { ConversationRepo } from './data/conversation.ts';

const convService = new ConversationService();

function jsonResponse(res: http.ServerResponse, status: number, obj: any){ res.writeHead(status, {'Content-Type':'application/json'}); res.end(JSON.stringify(obj)); }

function parseBody(req: http.IncomingMessage){ return new Promise<any>((resolve,reject)=>{ let b=''; req.on('data',(c: any)=> b += c); req.on('end', ()=> { try{ resolve(b ? JSON.parse(b) : {}) } catch(e){ reject(e) } }); req.on('error', reject); }); }

const server = http.createServer(async (req,res)=>{
  const parsed = url.parse(req.url || '', true);
  try{
    if (req.method === 'POST' && parsed.pathname === '/v1/pair/start'){
      const body = await parseBody(req);
      const deviceName = body?.device_name;
      const pair = await DeviceService.startPairing(deviceName);
      return jsonResponse(res, 200, pair);
    }

    if (req.method === 'POST' && parsed.pathname === '/v1/pair/confirm'){
      const body = await parseBody(req);
      const code = body?.code;
      if (!code) return jsonResponse(res, 400, {error: 'code required'});
      const dev = await DeviceService.confirmPairing(code);
      return jsonResponse(res, 201, {device_token: dev.token, device_id: dev.id});
    }

    if (req.method === 'POST' && parsed.pathname === '/v1/conversations'){
      const body = await parseBody(req);
      const userId = body?.user_id;
      const title = body?.title;
      const convo = await convService.createConversation(userId, title);
      return jsonResponse(res, 201, convo);
    }

    // ARES chat: send a message to the ARES orchestrator and get a routing reply
    if (req.method === 'POST' && parsed.pathname === '/v1/ares/chat'){
      const body = await parseBody(req);
      const userId = body?.user_id || 'local-user';
      const text = body?.message;
      if (!text) return jsonResponse(res, 400, { error: 'message required' });
      const { AresService } = await import('./services/aresService.ts');
      const convo = await AresService.ensureAresConversation(userId);
      const reply = await AresService.handleMessage(convo.id, text);
      return jsonResponse(res, 200, { conversationId: convo.id, reply });
    }

    // list ARES conversations for a user
    if (req.method === 'GET' && parsed.pathname === '/v1/ares/conversations'){
      const userId = (parsed.query || {}).user_id as string | undefined || 'local-user';
      const { AresService } = await import('./services/aresService.ts');
      const convo = await AresService.ensureAresConversation(userId);
      return jsonResponse(res, 200, { conversationId: convo.id });
    }

    if (req.method === 'POST' && parsed.pathname && parsed.pathname.startsWith('/v1/conversations/') && parsed.pathname.endsWith('/messages')){
      const parts = parsed.pathname.split('/');
      const convoId = parts[3];
      const auth = (req.headers['authorization'] || '').toString();
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (!token) return jsonResponse(res, 401, {error: 'missing token'});
      const dev = await DeviceService.validateToken(token);
      if (!dev) return jsonResponse(res, 403, {error: 'invalid token'});
      
      // Enforce authorization: device can only post to conversations belonging to its user
      const conv = await ConversationRepo.getConversation(convoId);
      if (!conv || conv.userId !== dev.userId) {
        return jsonResponse(res, 403, {error: 'forbidden'});
      }
      
      const body = await parseBody(req);
      const role = body?.role || 'user';
      const content = body?.content;
      if (!content) return jsonResponse(res, 400, {error: 'content required'});
      const msg = await convService.appendMessage(convoId, role, content, body?.timestamp);
      return jsonResponse(res, 201, msg);
    }

    if (req.method === 'GET' && parsed.pathname && parsed.pathname.startsWith('/v1/conversations/') && parsed.pathname.endsWith('/messages')){
      const parts = parsed.pathname.split('/');
      const convoId = parts[3];
      const after = (parsed.query || {}).after as string | undefined;
      const list = await convService.listMessages(convoId, after);
      return jsonResponse(res, 200, list);
    }

    // dashboard endpoint
    if (req.method === 'GET' && parsed.pathname === '/v1/dashboard'){
      const { buildDashboard } = await import('./domain/dashboard.ts');
      const root = process.cwd();
      const summary = buildDashboard(root);
      return jsonResponse(res, 200, summary);
    }

    // fallback
    jsonResponse(res, 404, {error: 'not found'});
  }catch(e:any){ jsonResponse(res, 500, {error: e.message || 'server error'}); }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// If USE_SQL is enabled, attempt a one-time migration from file storage into SQL if SQL has no data
if (process.env.USE_SQL === '1' || process.env.USE_SQL === 'true') {
  try {
    const fileModule = await import('./data/storage.ts');
    const sqlModule = await import('./data/sqlStorage.ts');
    const fileStorage = fileModule.Storage;
    const sqlStorage = sqlModule.default;
    const fileConvs = fileStorage.listConversations();
    const sqlConvs = sqlStorage.listConversations();
    if (Object.keys(sqlConvs).length === 0 && Object.keys(fileConvs).length > 0) {
      console.log('Migrating file storage -> SQL (one-time)');
      const msgs = fileStorage.listMessages();
      // convert convs map to array of objects expected by sql save (sql save expects objects with keys matching fields)
      const convArray = Object.values(fileConvs).map((c:any) => ({ id: c.id, userId: c.userId, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt }));
      sqlStorage.saveConversations(convArray);
      sqlStorage.saveMessages(msgs);
      const devs = fileStorage.listDevices();
      sqlStorage.saveDevices(devs);
      console.log('Migration complete');
    }
  } catch (e) {
    console.warn('Migration check failed:', e instanceof Error ? e.message : String(e));
  }
}

server.listen(PORT, ()=> console.log(`Aries local server listening on http://localhost:${PORT}`));

// WebSocket realtime endpoint
import WebSocket, { WebSocketServer } from 'ws';
import { Events } from './events.ts';

const subscriptions: Map<string, Set<WebSocket>> = new Map();

const wss = new WebSocketServer({ server, path: '/v1/realtime' });

wss.on('connection', async (ws, req) => {
  try {
    const parsed = url.parse(req.url || '', true);
    const token = (parsed.query && (parsed.query as any).token) || null;
    if (!token) { ws.close(4001, 'missing token'); return; }
    const dev = await DeviceService.validateToken(token.toString());
    if (!dev) { ws.close(4003, 'invalid token'); return; }

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg && msg.type === 'subscribe' && msg.conversationId) {
          const convId = msg.conversationId as string;
          let set = subscriptions.get(convId);
          if (!set) { set = new Set(); subscriptions.set(convId, set); }
          set.add(ws);
          // send ack
          ws.send(JSON.stringify({ type: 'subscribed', conversationId: convId }));
        }
      } catch (e) { /* ignore malformed */ }
    });

    ws.on('close', () => {
      // remove from all subscriptions
      for (const [convId, set] of subscriptions.entries()) {
        if (set.has(ws)) { set.delete(ws); if (set.size === 0) subscriptions.delete(convId); }
      }
    });

  } catch (e) {
    try { ws.close(1011, 'server error'); } catch(_) {}
  }
});

Events.on('message', (msg: any) => {
  const convId = msg.conversationId as string;
  const set = subscriptions.get(convId);
  if (!set || set.size === 0) return;
  const payload = JSON.stringify({ type: 'message', message: msg });
  for (const ws of Array.from(set)) {
    try { if (ws.readyState === WebSocket.OPEN) ws.send(payload); }
    catch (e) { /* ignore send errors */ }
  }
});

