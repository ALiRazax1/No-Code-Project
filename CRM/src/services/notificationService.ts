import { supabase } from './supabase';

export interface Notification {
  id: string;
  type: string;
  title: string;
  description: string;
  read: boolean;
  createdAt: string;
}

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  description: string;
  read: boolean;
  created_at: string;
}

function toNotification(r: NotificationRow): Notification {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    description: r.description,
    read: r.read,
    createdAt: r.created_at,
  };
}

export const notificationService = {
  async list(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return (data as NotificationRow[]).map(toNotification);
  },

  async unreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);
    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  async markAllAsRead(): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false);
    if (error) throw new Error(error.message);
  },

  async create(data: { type: string; title: string; description: string }): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .insert(data);
    if (error) console.warn('Failed to create notification:', error.message);
  },
};
