#!/usr/bin/env node
import readline from 'readline';
import http from 'http';

function postMessage(message: string){
  return new Promise<any>((resolve,reject)=>{
    const data = JSON.stringify({ user_id: 'local-user', message });
    const opts: any = { hostname: '127.0.0.1', port: 3000, path: '/v1/ares/chat', method: 'POST', headers: { 'Content-Type':'application/json', 'Content-Length': Buffer.byteLength(data) } };
    const req = http.request(opts, (res)=>{
      let b=''; res.on('data',c=> b+=c); res.on('end', ()=> { try{ resolve(b ? JSON.parse(b) : null); } catch(e){ reject(e);} });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log('ARES CLI — type messages to send (ctrl+c to exit)');
rl.on('line', async (line) => {
  if (!line || !line.trim()) return;
  try{
    const resp = await postMessage(line.trim());
    console.log('ARES reply:', resp.reply?.content || resp.reply || JSON.stringify(resp));
  }catch(e){ console.error('error', e.message || e); }
});
