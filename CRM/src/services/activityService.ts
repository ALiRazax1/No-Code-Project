import { supabase } from './supabase';
import type { Activity } from '@/types';

interface ActivityRow {
  id: string;
  type: Activity['type'];
  description: string;
  actor: string;
  created_at: string;
}

function toActivity(r: ActivityRow): Activity {
  return {
    id: r.id,
    type: r.type,
    description: r.description,
    user: r.actor,
    createdAt: r.created_at,
  };
}

export const activityService = {
  async list(): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data as ActivityRow[]).map(toActivity);
  },
};

// Internal helper used by other services to record activity
export async function logActivity(
  type: Activity['type'],
  description: string,
  actor: string,
): Promise<void> {
  const { error } = await supabase
    .from('activity_logs')
    .insert({ type, description, actor });
  if (error) {
    // Non-fatal: don't block the main operation
    console.warn('Failed to log activity:', error.message);
  }
}
