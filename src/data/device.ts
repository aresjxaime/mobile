import { v4 as uuidv4 } from 'uuid';
import { Storage } from './storage_adapter.ts';

export interface Device {
  id: string;
  userId: string;  // User this device belongs to
  name: string;
  token: string;
  pairedAt: string;
  lastSeen?: string;
}

function isoNow() {
  return new Date().toISOString();
}

export const DeviceRepo = {
  createDevice: async (name: string, userId: string = 'default-user'): Promise<Device> => {
    const devs = Storage.listDevices() as Record<string, Device>;
    const id = uuidv4();
    const now = isoNow();
    const device: Device = { id, userId, name, token: '', pairedAt: now } as any;
    devs[id] = device;
    Storage.saveDevices(devs);
    // create initial token
    const tokens = Storage.listTokens();
    if (!tokens[id]) tokens[id] = [];
    const token = uuidv4();
    const tokenEntry = { id: token, token, expiresAt: null, revoked: false, createdAt: now };
    tokens[id].push(tokenEntry);
    Storage.saveTokens(tokens);
    // return device with token for convenience
    return { ...device, token } as Device;
  },

  getByToken: async (token: string): Promise<Device | null> => {
    const tokens = Storage.listTokens();
    for (const [deviceId, list] of Object.entries(tokens)) {
      for (const t of list) {
        if (t.token === token && !t.revoked && (!t.expiresAt || t.expiresAt > new Date().toISOString())) {
          const devs = Storage.listDevices();
          return devs[deviceId] || null;
        }
      }
    }
    return null;
  },

  touch: async (id: string) => {
    const devs = Storage.listDevices() as Record<string, Device>;
    if (!devs[id]) return;
    devs[id].lastSeen = isoNow();
    Storage.saveDevices(devs);
  },

  rotateToken: async (deviceId: string, ttlSeconds?: number) => {
    const tokens = Storage.listTokens();
    const now = isoNow();
    const token = uuidv4();
    const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds*1000).toISOString() : null;
    if (!tokens[deviceId]) tokens[deviceId] = [];
    tokens[deviceId].push({ id: token, token, expiresAt, revoked: false, createdAt: now });
    Storage.saveTokens(tokens);
    return { token, expiresAt };
  },

  revokeToken: async (token: string) => {
    const tokens = Storage.listTokens();
    let changed = false;
    for (const [deviceId, list] of Object.entries(tokens)) {
      for (const t of list) {
        if (t.token === token) { t.revoked = true; changed = true; }
      }
    }
    if (changed) Storage.saveTokens(tokens);
    return changed;
  }
,
};
