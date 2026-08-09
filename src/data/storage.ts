import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.env.ARIES_DATA_DIR || path.join(process.cwd(), '.data'));
const CONV_FILE = path.join(DATA_DIR, 'conversations.json');
const MSG_FILE = path.join(DATA_DIR, 'messages.json');
const DEV_FILE = path.join(DATA_DIR, 'devices.json');

export class StorageCorruptError extends Error {
  constructor(file: string, cause?: unknown) {
    super(`Storage file corrupt: ${file}`);
    this.name = 'StorageCorruptError';
    if (cause instanceof Error) this.cause = cause;
  }
}

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(CONV_FILE)) fs.writeFileSync(CONV_FILE, JSON.stringify({}), 'utf8');
  if (!fs.existsSync(MSG_FILE)) fs.writeFileSync(MSG_FILE, JSON.stringify({}), 'utf8');
  if (!fs.existsSync(DEV_FILE)) fs.writeFileSync(DEV_FILE, JSON.stringify({}), 'utf8');
}

function readJson(file: string) {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
  } catch (error) {
    throw new StorageCorruptError(file, error);
  }
}

function writeJsonAtomic(file: string, obj: unknown) {
  ensure();
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

export const Storage = {
  getDataDir(): string {
    return DATA_DIR;
  },
  listConversations(): Record<string, unknown> {
    return readJson(CONV_FILE) as Record<string, unknown>;
  },
  saveConversations(convMap: Record<string, unknown>) {
    writeJsonAtomic(CONV_FILE, convMap);
  },
  listMessages(): Record<string, unknown[]> {
    return readJson(MSG_FILE) as Record<string, unknown[]>;
  },
  saveMessages(msgMap: Record<string, unknown[]>) {
    writeJsonAtomic(MSG_FILE, msgMap);
  },
  listDevices(): Record<string, unknown> {
    return readJson(DEV_FILE) as Record<string, unknown>;
  },
  saveDevices(devMap: Record<string, unknown>) {
    writeJsonAtomic(DEV_FILE, devMap);
  },
  // Token helpers for compatibility with SQL adapter
  listTokens(): Record<string, any[]> {
    // Derive token list from devices file: each device may contain a token field
    const devs = readJson(DEV_FILE) as Record<string, any>;
    const map: Record<string, any[]> = {};
    for (const [id, d] of Object.entries(devs)) {
      const device = d as any;
      if (!map[id]) map[id] = [];
      if (device && device.token) {
        map[id].push({ token: device.token, expiresAt: device.expiresAt || null, revoked: !!device.revoked });
      }
    }
    return map;
  },
  saveTokens(tokenMap: Record<string, any[]>) {
    // Merge tokens into devices file for file-storage fallback: keep only latest token per device
    const devs = readJson(DEV_FILE) as Record<string, any>;
    for (const [deviceId, tokens] of Object.entries(tokenMap)) {
      if (!devs[deviceId]) devs[deviceId] = { id: deviceId };
      const latest = tokens && tokens.length ? tokens[tokens.length - 1] : null;
      if (latest) {
        devs[deviceId].token = latest.token;
        devs[deviceId].expiresAt = latest.expiresAt || null;
        devs[deviceId].revoked = !!latest.revoked;
      }
    }
    writeJsonAtomic(DEV_FILE, devs);
  },
};
