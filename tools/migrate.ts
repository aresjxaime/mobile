#!/usr/bin/env node

// Simple migration tool: copies file-based storage into SQL storage, with backups.

import fs from 'fs';
import path from 'path';

async function run() {
  const fileModule = await import('../src/data/storage.ts');
  const sqlModule = await import('../src/data/sqlStorage.ts');
  const fileStorage = fileModule.Storage;
  const sqlStorage = sqlModule.default;

  const dataDir = fileStorage.getDataDir ? fileStorage.getDataDir() : path.resolve(process.cwd(), '.data');
  const backupDir = path.join(dataDir, 'backup_' + Date.now());
  fs.mkdirSync(backupDir, { recursive: true });

  // backup raw files
  const files = ['conversations.json','messages.json','devices.json'];
  for (const f of files) {
    const src = path.join(dataDir, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(backupDir, f));
  }
  console.log('Backup created at', backupDir);

  // perform migration only if SQL empty
  const sqlConvs = sqlStorage.listConversations();
  const fileConvs = fileStorage.listConversations();
  if (Object.keys(sqlConvs).length > 0) {
    console.log('SQL already contains data; aborting migration');
    process.exit(0);
  }

  const convArray = Object.values(fileConvs).map((c:any) => ({ id: c.id, userId: c.userId, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt }));
  sqlStorage.saveConversations(convArray);
  const msgs = fileStorage.listMessages();
  sqlStorage.saveMessages(msgs);
  const devs = fileStorage.listDevices();
  sqlStorage.saveDevices(devs);

  console.log('Migration complete');
}

run().catch(e=>{ console.error('Migration failed', e); process.exit(1); });
