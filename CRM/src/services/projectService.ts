import { supabase } from './supabase';
import type { Project, ProjectMember } from '@/types';
import { logActivity } from './activityService';

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  status: Project['status'];
  progress: number;
  deadline: string;
  members: ProjectMember[] | string;
  created_at: string;
  updated_at: string;
}

function toProject(r: ProjectRow, tasksCount = 0, completedTasks = 0): Project {
  const members = Array.isArray(r.members) ? r.members : [];
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    status: r.status,
    progress: r.progress,
    deadline: r.deadline,
    members,
    tasksCount,
    completedTasks,
  };
}

async function getTaskCounts(projectId: string): Promise<{ tasksCount: number; completedTasks: number }> {
  const { data, error } = await supabase
    .from('tasks')
    .select('status')
    .eq('project_id', projectId);
  if (error) return { tasksCount: 0, completedTasks: 0 };
  const rows = data as { status: string }[];
  return {
    tasksCount: rows.length,
    completedTasks: rows.filter((t) => t.status === 'done').length,
  };
}

export const projectService = {
  async list(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    const projects = data as ProjectRow[];
    const withCounts = await Promise.all(
      projects.map(async (p) => {
        const counts = await getTaskCounts(p.id);
        return toProject(p, counts.tasksCount, counts.completedTasks);
      }),
    );
    return withCounts;
  },

  async get(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const counts = await getTaskCounts(id);
    return toProject(data as ProjectRow, counts.tasksCount, counts.completedTasks);
  },

  async create(data: Omit<Project, 'id' | 'tasksCount' | 'completedTasks'>): Promise<Project> {
    const row = {
      name: data.name,
      description: data.description,
      status: data.status,
      progress: data.progress,
      deadline: data.deadline,
      members: data.members,
    };
    const { data: created, error } = await supabase
      .from('projects')
      .insert(row)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    const project = toProject(created as ProjectRow, 0, 0);
    await logActivity('project', `Project "${project.name}" created`, '');
    return project;
  },

  async update(id: string, data: Partial<Project>): Promise<Project | null> {
    const row: Record<string, unknown> = {};
    if (data.name !== undefined) row.name = data.name;
    if (data.description !== undefined) row.description = data.description;
    if (data.status !== undefined) row.status = data.status;
    if (data.progress !== undefined) row.progress = data.progress;
    if (data.deadline !== undefined) row.deadline = data.deadline;
    if (data.members !== undefined) row.members = data.members;

    const { data: updated, error } = await supabase
      .from('projects')
      .update(row)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    const project = updated ? toProject(updated as ProjectRow, 0, 0) : null;
    if (project) await logActivity('project', `Project "${project.name}" updated`, '');
    return project;
  },

  async remove(id: string): Promise<boolean> {
    const { data: existing, error: fetchErr } = await supabase
      .from('projects')
      .select('name')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);

    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw new Error(error.message);
    if (existing) await logActivity('project', `Project "${existing.name}" deleted`, '');
    return true;
  },
};
