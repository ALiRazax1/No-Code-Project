import { supabase } from './supabase';
import type { Conversation, Message } from '@/types';

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  outgoing: boolean;
  created_at: string;
}

function toMessage(r: MessageRow): Message {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    senderId: r.sender_id,
    senderName: r.sender_name,
    senderAvatar: r.sender_avatar ?? undefined,
    content: r.content,
    createdAt: r.created_at,
    outgoing: r.outgoing,
  };
}

function conversationIdFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

export const messageService = {
  async conversations(): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    const rows = data as MessageRow[];
    const byConv = new Map<string, { name: string; lastMessage: string; lastMessageAt: string; unread: number }>();

    for (const r of rows) {
      const key = r.conversation_id;
      const existing = byConv.get(key);
      if (!existing || new Date(r.created_at) > new Date(existing.lastMessageAt)) {
        byConv.set(key, {
          name: r.sender_name === 'You' ? r.conversation_id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : r.sender_name,
          lastMessage: r.content,
          lastMessageAt: r.created_at,
          unread: 0,
        });
      }
    }

    return Array.from(byConv.entries()).map(([id, info]) => ({
      id,
      name: info.name,
      lastMessage: info.lastMessage,
      lastMessageAt: info.lastMessageAt,
      unread: info.unread,
      online: false,
    }));
  },

  async messages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data as MessageRow[]).map(toMessage);
  },

  async send(conversationId: string, content: string): Promise<Message> {
    const { data: created, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: 'me',
        sender_name: 'You',
        content,
        outgoing: true,
      })
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    return toMessage(created as MessageRow);
  },

  // Start a new conversation with a contact name
  async startConversation(contactName: string): Promise<string> {
    return conversationIdFromName(contactName);
  },

  // Subscribe to realtime message inserts for a conversation
  subscribeToMessages(
    conversationId: string,
    callback: (message: Message) => void,
  ): { unsubscribe: () => void } {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          callback(toMessage(payload.new as MessageRow));
        },
      )
      .subscribe();

    return { unsubscribe: () => supabase.removeChannel(channel) };
  },
};
