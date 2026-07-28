import { supabase } from './supabase';
import type { Task } from '@/types';
import { logActivity } from './activityService';

interface TaskRow {
  id: string;
  project_id: string | null;
  title: string;
  description: string;
  status: Task['status'];
  priority: Task['priority'];
  assignee: string;
  due_date: string;
  created_at: string;
  updated_at: string;
}

function toTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    assignee: r.assignee,
    dueDate: r.due_date,
    projectId: r.project_id ?? undefined,
  };
}

export const taskService = {
  async list(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as TaskRow[]).map(toTask);
  },

  async create(data: Omit<Task, 'id'>): Promise<Task> {
    const row = {
      project_id: data.projectId ?? null,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assignee: data.assignee,
      due_date: data.dueDate,
    };
    const { data: created, error } = await supabase
      .from('tasks')
      .insert(row)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    const task = toTask(created as TaskRow);
    await logActivity('task', `Task "${task.title}" created`, task.assignee);
    return task;
  },

  async update(id: string, data: Partial<Task>): Promise<Task | null> {
    const row: Record<string, unknown> = {};
    if (data.title !== undefined) row.title = data.title;
    if (data.description !== undefined) row.description = data.description;
    if (data.status !== undefined) row.status = data.status;
    if (data.priority !== undefined) row.priority = data.priority;
    if (data.assignee !== undefined) row.assignee = data.assignee;
    if (data.dueDate !== undefined) row.due_date = data.dueDate;
    if (data.projectId !== undefined) row.project_id = data.projectId ?? null;

    const { data: updated, error } = await supabase
      .from('tasks')
      .update(row)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    const task = updated ? toTask(updated as TaskRow) : null;
    if (task && data.status === 'done') {
      await logActivity('task', `Task "${task.title}" completed`, task.assignee);
    }
    return task;
  },

  async remove(id: string): Promise<boolean> {
    const { data: existing, error: fetchErr } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);

    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw new Error(error.message);
    if (existing) await logActivity('task', `Task "${existing.title}" deleted`, '');
    return true;
  },
};
