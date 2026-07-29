import type { IncomingMessage } from 'http';
import { DeviceRepo, type Device } from '../data/device.js';
import { ConversationRepo } from '../data/conversation.js';
import { DeviceService } from '../services/deviceService.js';
import { HttpError } from './errors.js';
import type { Conversation } from '../data/conversation.js';

export function extractBearer(req: IncomingMessage): string | null {
  const auth = (req.headers.authorization || '').toString();
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function requireDevice(req: IncomingMessage): Promise<Device> {
  const token = extractBearer(req);
  if (!token) throw new HttpError(401, 'missing token');

  const device = await DeviceService.validateToken(token);
  if (!device) throw new HttpError(403, 'invalid token');

  await DeviceRepo.touch(device.id);
  return device;
}

export async function requireConversationAccess(
  device: Device,
  conversationId: string,
): Promise<Conversation> {
  const conversation = await ConversationRepo.getConversation(conversationId);
  if (!conversation || conversation.userId !== device.id) {
    throw new HttpError(404, 'not found');
  }
  return conversation;
}
