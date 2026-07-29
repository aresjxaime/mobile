import crypto from 'crypto';
import { DeviceRepo } from '../data/device.ts';

interface PairingEntry {
  code: string;
  expiresAt: string;
  name?: string;
}

const pairingStore: Record<string, PairingEntry> = {};

export const DeviceService = {
  startPairing: async (deviceName?: string) => {
    const code = crypto.randomInt(100_000, 1_000_000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    pairingStore[code] = { code, expiresAt, name: deviceName };
    return { code, expiresAt };
  },

  confirmPairing: async (code: string) => {
    const entry = pairingStore[code];
    if (!entry) throw new Error('invalid code');
    if (new Date(entry.expiresAt) < new Date()) {
      delete pairingStore[code];
      throw new Error('code expired');
    }

    const device = await DeviceRepo.createDevice(entry.name || 'android-device');
    delete pairingStore[code];
    return device;
  },

  validateToken: async (token: string) => {
    return DeviceRepo.getByToken(token);
  },
};
