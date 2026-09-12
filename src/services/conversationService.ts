import { ConversationRepo, type Conversation, type Message, type Role } from '../data/conversation.ts';

const MAX_CONTENT_LENGTH = 32_768;
const MAX_TITLE_LENGTH = 200;

export class ConversationService {
  async createConversation(userId: string, title?: string): Promise<Conversation> {
    if (!userId) throw new Error('userId required');
    if (title && title.length > MAX_TITLE_LENGTH) {
      throw new Error('title too long');
    }
    return ConversationRepo.createConversation(userId, title);
  }

  async appendMessage(
    conversationId: string,
    role: Role,
    content: string,
    timestamp?: string,
  ): Promise<Message> {
    if (!content || content.trim() === '') throw new Error('content required');
    if (content.length > MAX_CONTENT_LENGTH) throw new Error('content too long');
    if (!['user', 'assistant', 'system'].includes(role)) throw new Error('invalid role');
    return ConversationRepo.appendMessage(conversationId, role, content, timestamp);
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return ConversationRepo.getConversation(id);
  }

  async listConversations(userId: string): Promise<Conversation[]> {
    if (!userId) throw new Error('userId required');
    const list = await ConversationRepo.listConversationsByUser(userId);
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listMessages(conversationId: string, after?: string) {
    return ConversationRepo.listMessages(conversationId, after);
  }
}
