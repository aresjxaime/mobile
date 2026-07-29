import { v4 as uuidv4 } from 'uuid';
import { Storage } from './storage.ts';
import { Events } from '../events.ts';

export type Role = 'user' | 'assistant' | 'system';

export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  timestamp: string;
  createdAt: string;
}

function isoNow() {
  return new Date().toISOString();
}

export const ConversationRepo = {
  createConversation: async (userId: string, title?: string): Promise<Conversation> => {
    const convs = Storage.listConversations() as Record<string, Conversation>;
    const id = uuidv4();
    const now = isoNow();
    const conv: Conversation = { id, userId, title, createdAt: now, updatedAt: now };
    convs[id] = conv;
    Storage.saveConversations(convs);
    return conv;
  },

  getConversation: async (id: string): Promise<Conversation | null> => {
    const convs = Storage.listConversations() as Record<string, Conversation>;
    return convs[id] || null;
  },

  listConversationsByUser: async (userId: string): Promise<Conversation[]> => {
    const convs = Storage.listConversations() as Record<string, Conversation>;
    return Object.values(convs).filter((c) => c.userId === userId);
  },

  appendMessage: async (
    conversationId: string,
    role: Role,
    content: string,
    timestamp?: string,
  ): Promise<Message> => {
    const convs = Storage.listConversations() as Record<string, Conversation>;
    if (!convs[conversationId]) throw new Error('Conversation not found');

    const msgs = Storage.listMessages() as Record<string, Message[]>;
    if (!msgs[conversationId]) msgs[conversationId] = [];

    const id = uuidv4();
    const now = isoNow();
    const msg: Message = {
      id,
      conversationId,
      role,
      content,
      timestamp: timestamp || now,
      createdAt: now,
    };

    msgs[conversationId].push(msg);
    Storage.saveMessages(msgs);

    convs[conversationId].updatedAt = now;
    Storage.saveConversations(convs);

    // emit a message event for realtime subscribers
    try { Events.emit('message', msg); } catch (e) { /* no-op */ }

    return msg;
  },


  listMessages: async (conversationId: string, after?: string): Promise<Message[]> => {
    const msgs = Storage.listMessages() as Record<string, Message[]>;
    const list = msgs[conversationId] || [];
    if (!after) return list.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return list
      .filter((m) => m.timestamp > after)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  },
};
