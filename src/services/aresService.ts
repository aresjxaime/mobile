import { ConversationRepo, Message, Role } from '../data/conversation.ts';

// Simple ARES orchestrator service: stores user messages and creates a short ARES reply
// This is a local router placeholder — it does not call external LLMs.

export const AresService = {
  // Ensure a conversation exists for ARES interactions for a user
  ensureAresConversation: async (userId: string) => {
    // try to find existing conversation titled 'ARES'
    const list = await ConversationRepo.listConversationsByUser(userId);
    let convo = list.find(c => c.title === 'ARES');
    if (!convo) convo = await ConversationRepo.createConversation(userId, 'ARES');
    return convo;
  },

  // Accept a user message, store it, and produce a short routing reply
  handleMessage: async (conversationId: string, text: string) : Promise<Message> => {
    // append user message
    await ConversationRepo.appendMessage(conversationId, 'user', text);

    // naive routing logic: pick persona based on keywords
    const lower = (text || '').toLowerCase();
    let persona = '⚔️ ARES';
    if (lower.includes('health') || lower.includes('exercise') || lower.includes('sleep')) persona = '❤️ ASCLEPIUS';
    else if (lower.includes('tax') || lower.includes('account')) persona = '📚 SCHOLAR';
    else if (lower.includes('legal') || lower.includes('law') || lower.includes('contract')) persona = '⚖️ THEMIS';
    else if (lower.includes('finance') || lower.includes('invest')) persona = '💰 MIDAS';
    else if (lower.includes('plan') || lower.includes('roadmap')) persona = '📈 HERMES';

    const reply = `[Active Agent: ${persona}] ARES received your message and suggested routing to ${persona}. This is a local orchestrator stub. Use the agent name to address a specialist.`;

    const msg = await ConversationRepo.appendMessage(conversationId, 'assistant', reply);
    return msg;
  }
};
