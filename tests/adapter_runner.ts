#!/usr/bin/env ts-node

// Runs simple checks against storage adapters (file or sql)
const mode = process.argv[2] || 'file';
if (mode === 'sql') process.env.USE_SQL = '1'; else process.env.USE_SQL = '0';

import('../src/data/conversation.ts').then(async (mod) => {
  const ConversationRepo = (mod as any).ConversationRepo;
  const DeviceRepo = (await import('../src/data/device.ts')).DeviceRepo;

  try {
    // cleanup .data for file mode
    if (process.env.USE_SQL === '0') {
      // no-op
    }

    const conv = await ConversationRepo.createConversation('test-user-' + mode, 'test-convo');
    const msg = await ConversationRepo.appendMessage(conv.id, 'user', 'hello ' + mode);
    const msgs = await ConversationRepo.listMessages(conv.id);
    if (!msgs || msgs.length === 0) throw new Error('no messages');

    const dev = await DeviceRepo.createDevice('dev-' + mode);
    const found = await DeviceRepo.getByToken(dev.token);
    if (!found) throw new Error('device lookup failed');

    console.log('adapter', mode, 'ok');
    process.exit(0);
  } catch (e:any) {
    console.error('adapter', mode, 'failed', e);
    process.exit(2);
  }
});
