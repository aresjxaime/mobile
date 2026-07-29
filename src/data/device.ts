import { v4 as uuidv4 } from 'uuid';
import { Storage } from './storage.ts';

export interface Device {
  id: string;
  name: string;
  token: string;
  pairedAt: string;
  lastSeen?: string;
}

function isoNow() {
  return new Date().toISOString();
}

export const DeviceRepo = {
  createDevice: async (name: string): Promise<Device> => {
    const devs = Storage.listDevices() as Record<string, Device>;
    const id = uuidv4();
    const token = uuidv4();
    const now = isoNow();
    const device: Device = { id, name, token, pairedAt: now };
    devs[id] = device;
    Storage.saveDevices(devs);
    return device;
  },

  getByToken: async (token: string): Promise<Device | null> => {
    const devs = Storage.listDevices() as Record<string, Device>;
    const found = Object.values(devs).find((d) => d.token === token);
    return found || null;
  },

  touch: async (id: string) => {
    const devs = Storage.listDevices() as Record<string, Device>;
    if (!devs[id]) return;
    devs[id].lastSeen = isoNow();
    Storage.saveDevices(devs);
  },
};
