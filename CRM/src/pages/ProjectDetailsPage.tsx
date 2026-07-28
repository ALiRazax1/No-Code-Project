import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, Circle, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarGroup } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { projectService, taskService } from '@/services/services';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { ProjectStatus } from '@/types';

const statusVariant: Record<ProjectStatus, 'default' | 'brand' | 'warning' | 'success'> = {
  planning: 'warning', active: 'brand', on_hold: 'default', completed: 'success',
};

export function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useQuery({ queryKey: ['projects', id], queryFn: () => projectService.get(id!) });
  const { data: tasks } = useQuery({ queryKey: ['tasks'], queryFn: taskService.list });

  if (isLoading) return <FullPageSpinner />;
  if (!project) {
    return <EmptyState icon={<Calendar className="h-6 w-6" />} title="Project not found" action={<Button onClick={() => navigate('/app/projects')}>Back to projects</Button>} />;
  }

  const projectTasks = (tasks ?? []).filter((t) => t.projectId === project.id);
  const done = projectTasks.filter((t) => t.status === 'done').length;

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Projects', to: '/app/projects' }, { label: project.name }]}
        actions={<Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/app/projects')}>Back</Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{project.name}</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{project.description}</p>
              </div>
              <Badge variant={statusVariant[project.status]} dot>{project.status.replace('_', ' ')}</Badge>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Progress</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{project.progress}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className={cn('h-full rounded-full transition-all', project.progress === 100 ? 'bg-emerald-500' : 'bg-brand-500')} style={{ width: `${project.progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{project.completedTasks} of {project.tasksCount} tasks completed</p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Project Tasks" subtitle={`${done} completed of ${projectTasks.length}`} />
            <div className="space-y-2">
              {projectTasks.length === 0 ? (
                <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="No tasks in this project" />
              ) : (
                projectTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                    {t.status === 'done' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600" />}
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm font-medium', t.status === 'done' ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-900 dark:text-gray-100')}>{t.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t.assignee} · {formatDate(t.dueDate)}</p>
                    </div>
                    <Badge variant={t.priority === 'urgent' ? 'danger' : t.priority === 'high' ? 'warning' : 'default'}>{t.priority}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Deadline" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatDate(project.deadline)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Project deadline</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Team Members" subtitle={`${project.members.length} members`} />
            <div className="space-y-3">
              {project.members.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.name} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
              <AvatarGroup members={project.members} max={5} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Stats" />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Tasks</p>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{project.tasksCount}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{project.completedTasks}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
