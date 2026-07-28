import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Flag, CheckSquare } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { taskService, projectService } from '@/services/services';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/format';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const { data: tasks } = useQuery({ queryKey: ['tasks'], queryFn: taskService.list });
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: projectService.list });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const events: { date: Date; label: string; type: 'task' | 'project' }[] = [
    ...(tasks ?? []).map((t) => ({ date: new Date(t.dueDate), label: t.title, type: 'task' as const })),
    ...(projects ?? []).map((p) => ({ date: new Date(p.deadline), label: p.name, type: 'project' as const })),
  ];

  const cells: (Date | null)[] = [
    ...Array.from({ length: startOffset }).map(() => null),
    ...Array.from({ length: daysInMonth }).map((_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthEvents = events.filter((e) => e.date.getMonth() === month && e.date.getFullYear() === year);

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Tasks and project deadlines"
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Calendar' }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft className="h-5 w-5" /></button>
              <button onClick={() => setCursor(new Date())} className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40">Today</button>
              <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronRight className="h-5 w-5" /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-2 text-center text-xs font-semibold text-gray-400">{d}</div>
            ))}
            {cells.map((date, i) => {
              if (!date) return <div key={i} className="min-h-24 rounded-lg" />;
              const dayEvents = events.filter((e) => sameDay(e.date, date));
              const isToday = sameDay(date, today);
              return (
                <div
                  key={i}
                  className={cn(
                    'min-h-24 rounded-lg border p-1.5 transition',
                    isToday ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20' : 'border-gray-100 dark:border-gray-800',
                  )}
                >
                  <span className={cn('text-xs font-medium', isToday ? 'text-brand-600 dark:text-brand-400' : 'text-gray-600 dark:text-gray-400')}>{date.getDate()}</span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 2).map((e, j) => (
                      <div
                        key={j}
                        className={cn(
                          'truncate rounded px-1 py-0.5 text-[10px] font-medium',
                          e.type === 'task' ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
                        )}
                      >
                        {e.label}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <p className="text-[10px] text-gray-400">+{dayEvents.length - 2} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">This Month</h3>
          <div className="space-y-3">
            {monthEvents.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <CalIcon className="h-6 w-6 text-gray-300 dark:text-gray-700" />
                <p className="mt-2 text-sm text-gray-400">No events this month</p>
              </div>
            ) : (
              monthEvents.sort((a, b) => a.date.getTime() - b.date.getTime()).map((e, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 p-2.5 dark:border-gray-800">
                  <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', e.type === 'task' ? 'bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400')}>
                    {e.type === 'task' ? <CheckSquare className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{e.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(e.date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
