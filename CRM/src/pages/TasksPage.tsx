import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LayoutGrid, Table as TableIcon, Calendar, Flag, Trash2, CheckSquare } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { taskService } from '@/services/services';
import { QUERY_KEYS } from '@/constants';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Task, TaskStatus, TaskPriority } from '@/types';

const schema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assignee: z.string().min(1, 'Assignee is required'),
  dueDate: z.string().min(1, 'Due date is required'),
});
type FormData = z.infer<typeof schema>;

const columns: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'todo', label: 'To Do', color: 'border-t-gray-400' },
  { key: 'in_progress', label: 'In Progress', color: 'border-t-brand-500' },
  { key: 'review', label: 'Review', color: 'border-t-amber-500' },
  { key: 'done', label: 'Done', color: 'border-t-emerald-500' },
];

const priorityVariant: Record<TaskPriority, 'default' | 'info' | 'warning' | 'danger'> = {
  low: 'default', medium: 'info', high: 'warning', urgent: 'danger',
};

export function TasksPage() {
  const qc = useQueryClient();
  const { data: tasks, isLoading } = useQuery({ queryKey: QUERY_KEYS.tasks, queryFn: taskService.list });
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const createMut = useMutation({ mutationFn: taskService.create, onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks }); toast.success('Task created'); setModalOpen(false); } });
  const updateMut = useMutation({ mutationFn: (a: { id: string; data: Partial<Task> }) => taskService.update(a.id, a.data), onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks }) });
  const deleteMut = useMutation({ mutationFn: taskService.remove, onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks }); toast.success('Task deleted'); setDeleteTarget(null); } });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { status: 'todo', priority: 'medium', dueDate: new Date().toISOString().slice(0, 10) } });

  const openAdd = () => { reset({ title: '', description: '', status: 'todo', priority: 'medium', assignee: '', dueDate: new Date().toISOString().slice(0, 10) }); setModalOpen(true); };
  const onSubmit = (data: FormData) => createMut.mutate({ ...data, description: data.description ?? '' });

  const onDrop = (status: TaskStatus) => {
    if (draggedId) {
      updateMut.mutate({ id: draggedId, data: { status } });
      setDraggedId(null);
    }
  };

  const tableColumns: Column<Task>[] = [
    { key: 'title', header: 'Task', sortable: true, sortValue: (t) => t.title, render: (t) => (<div><p className="font-medium text-gray-900 dark:text-gray-100">{t.title}</p><p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{t.description}</p></div>) },
    { key: 'status', header: 'Status', sortable: true, sortValue: (t) => t.status, render: (t) => <Badge variant={t.status === 'done' ? 'success' : t.status === 'in_progress' ? 'brand' : t.status === 'review' ? 'warning' : 'default'}>{t.status.replace('_', ' ')}</Badge> },
    { key: 'priority', header: 'Priority', sortable: true, sortValue: (t) => t.priority, render: (t) => <Badge variant={priorityVariant[t.priority]} dot>{t.priority}</Badge> },
    { key: 'assignee', header: 'Assignee', render: (t) => (<div className="flex items-center gap-2"><Avatar name={t.assignee} size="xs" /><span className="text-sm">{t.assignee}</span></div>) },
    { key: 'dueDate', header: 'Due Date', sortable: true, sortValue: (t) => t.dueDate, render: (t) => <span className="text-gray-600 dark:text-gray-400">{formatDate(t.dueDate)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Organize and track your team's work"
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Tasks' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-800">
              <button onClick={() => setView('kanban')} className={cn('rounded-md p-1.5 transition', view === 'kanban' ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400' : 'text-gray-400')}><LayoutGrid className="h-4 w-4" /></button>
              <button onClick={() => setView('table')} className={cn('rounded-md p-1.5 transition', view === 'table' ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400' : 'text-gray-400')}><TableIcon className="h-4 w-4" /></button>
            </div>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openAdd}>New Task</Button>
          </div>
        }
      />

      {view === 'kanban' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => {
            const colTasks = (tasks ?? []).filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(col.key)}
                className={cn('card flex flex-col border-t-4 p-0', col.color)}
              >
                <div className="flex items-center justify-between p-4 pb-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{col.label}</h3>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">{colTasks.length}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-3 pt-1" style={{ maxHeight: '60vh' }}>
                  <AnimatePresence>
                    {colTasks.map((t) => (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        draggable
                        onDragStart={() => setDraggedId(t.id)}
                        className="cursor-grab rounded-xl border border-gray-200 bg-white p-3 transition hover:shadow-md active:cursor-grabbing dark:border-gray-800 dark:bg-gray-900"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.title}</p>
                          <button onClick={() => setDeleteTarget(t)} className="text-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                        {t.description && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{t.description}</p>}
                        <div className="mt-3 flex items-center justify-between">
                          <Badge variant={priorityVariant[t.priority]} dot>{t.priority}</Badge>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(t.dueDate)}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
                          <Avatar name={t.assignee} size="xs" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">{t.assignee}</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {colTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CheckSquare className="h-5 w-5 text-gray-300 dark:text-gray-700" />
                      <p className="mt-1 text-xs text-gray-400">Drop tasks here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <DataTable
          columns={tableColumns}
          data={tasks ?? []}
          loading={isLoading}
          rowKey={(t) => t.id}
          searchPlaceholder="Search tasks…"
          emptyIcon={<Flag className="h-6 w-6" />}
          actions={(t) => <button onClick={() => setDeleteTarget(t)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"><Trash2 className="h-4 w-4" /></button>}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Task"
        size="lg"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)} loading={createMut.isPending}>Create</Button></>}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Title" placeholder="Task title" error={errors.title?.message} {...register('title')} />
          <Textarea label="Description" rows={3} placeholder="Add details…" {...register('description')} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Status" options={[{ value: 'todo', label: 'To Do' }, { value: 'in_progress', label: 'In Progress' }, { value: 'review', label: 'Review' }, { value: 'done', label: 'Done' }]} {...register('status')} />
            <Select label="Priority" options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} {...register('priority')} />
            <Input label="Assignee" placeholder="Team member" error={errors.assignee?.message} {...register('assignee')} />
            <Input label="Due date" type="date" error={errors.dueDate?.message} {...register('dueDate')} />
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)} loading={deleteMut.isPending} title="Delete task?" message={`Remove "${deleteTarget?.title}"?`} confirmLabel="Delete" />
    </div>
  );
}
