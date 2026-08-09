import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(process.cwd(), '.data', 'aries.db');

function ensureDataDir(){ const dir = path.dirname(DB_PATH); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

let db: Database.Database | null = null;

function open() {
  if (db) return db;
  ensureDataDir();
  db = new Database(DB_PATH);
  // initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT,
      paired_at TEXT NOT NULL,
      last_seen TEXT
    );
    CREATE TABLE IF NOT EXISTS tokens (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TEXT,
      revoked INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conv_ts ON messages(conversation_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_tokens_device ON tokens(device_id);
  `);
  
  // Schema migration: handle legacy schema updates
  try {
    const info = db.prepare("PRAGMA table_info(devices)").all() as any[];
    const hasTokenColumn = info.some(col => col.name === 'token');
    const hasuserIdColumn = info.some(col => col.name === 'user_id');
    
    if (hasTokenColumn || !hasuserIdColumn) {
      db.exec(`
        ALTER TABLE devices RENAME TO devices_old;
        CREATE TABLE devices (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT,
          paired_at TEXT NOT NULL,
          last_seen TEXT
        );
        INSERT INTO devices (id, user_id, name, paired_at, last_seen) 
        SELECT id, 'default-user', name, paired_at, last_seen FROM devices_old;
        DROP TABLE devices_old;
      `);
    }
  } catch (e) {
    // ignore migration errors
  }
  
  return db;
}

export const SqlStorage = {
  listConversations(): Record<string, any> {
    const db = open();
    const rows = db.prepare('SELECT * FROM conversations').all() as any[];
    const map: Record<string, any> = {};
    for (const r of rows) map[r.id] = { id: r.id, userId: r.user_id, title: r.title, createdAt: r.created_at, updatedAt: r.updated_at };
    return map;
  },

  saveConversations(convMap: Record<string, any>) {
    const db = open();
    const insert = db.prepare('INSERT OR REPLACE INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
    const tx = db.transaction((items: any[]) => { for (const c of items) insert.run(c.id, c.userId, c.title || null, c.createdAt, c.updatedAt); });
    tx(Object.values(convMap));
  },
  listMessages(): Record<string, any[]> {
    const db = open();
    const rows = db.prepare('SELECT * FROM messages ORDER BY timestamp ASC').all() as any[];
    const map: Record<string, any[]> = {};
    for (const r of rows) {
      if (!map[r.conversation_id]) map[r.conversation_id] = [];
      map[r.conversation_id].push({ id: r.id, conversationId: r.conversation_id, role: r.role, content: r.content, timestamp: r.timestamp, createdAt: r.created_at });
    }
    return map;
  },
  saveMessages(msgMap: Record<string, any[]>) {
    const db = open();
    const insert = db.prepare('INSERT OR REPLACE INTO messages (id, conversation_id, role, content, timestamp, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    const tx = db.transaction((entries: Array<{id:string,conversationId:string,role:string,content:string,timestamp:string,createdAt:string}>) => {
      for (const m of entries) insert.run(m.id, m.conversationId, m.role, m.content, m.timestamp, m.createdAt);
    });
    const all: any[] = [];
    for (const convId of Object.keys(msgMap)) {
      const list = msgMap[convId] || [];
      for (const m of list) all.push(m);
    }
    tx(all);
  },
  listDevices(): Record<string, any> {
    const db = open();
    const rows = db.prepare('SELECT * FROM devices').all() as any[];
    const map: Record<string, any> = {};
    for (const r of rows) map[r.id] = { id: r.id, userId: r.user_id, name: r.name, token: '', pairedAt: r.paired_at, lastSeen: r.last_seen };
    return map;
  },
  saveDevices(devMap: Record<string, any>) {
    const db = open();
    const insert = db.prepare('INSERT OR REPLACE INTO devices (id, user_id, name, paired_at, last_seen) VALUES (?, ?, ?, ?, ?)');
    const tx = db.transaction((items: any[]) => { for (const d of items) insert.run(d.id, d.userId || 'default-user', d.name || null, d.pairedAt, d.lastSeen || null); });
    tx(Object.values(devMap));
  },
  // token operations
  listTokens(): Record<string, any[]> {
    const db = open();
    const rows = db.prepare('SELECT * FROM tokens ORDER BY created_at ASC').all() as any[];
    const map: Record<string, any[]> = {};
    for (const r of rows) {
      if (!map[r.device_id]) map[r.device_id] = [];
      map[r.device_id].push({ id: r.id, token: r.token, expiresAt: r.expires_at, revoked: !!r.revoked, createdAt: r.created_at });
    }
    return map;
  },
  saveTokens(tokenMap: Record<string, any[]>) {
    const db = open();
    const insert = db.prepare('INSERT OR REPLACE INTO tokens (id, device_id, token, expires_at, revoked, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    const tx = db.transaction((items: any[]) => { for (const t of items) insert.run(t.id, t.deviceId || t.device_id, t.token, t.expiresAt || null, t.revoked ? 1 : 0, t.createdAt); });
    const all: any[] = [];
    for (const deviceId of Object.keys(tokenMap)) {
      const list = tokenMap[deviceId] || [];
      for (const m of list) all.push({ id: m.id || m.token, deviceId, token: m.token, expiresAt: m.expiresAt || null, revoked: m.revoked ? 1 : 0, createdAt: m.createdAt || new Date().toISOString() });
    }
    tx(all);
  }
};

export default SqlStorage;
