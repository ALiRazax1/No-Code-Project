import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, FolderKanban } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AvatarGroup } from '@/components/ui/Avatar';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { projectService } from '@/services/services';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Project, ProjectStatus } from '@/types';

const statusVariant: Record<ProjectStatus, 'default' | 'brand' | 'warning' | 'success'> = {
  planning: 'warning', active: 'brand', on_hold: 'default', completed: 'success',
};

export function ProjectsPage() {
  const { data: projects, isLoading } = useQuery({ queryKey: ['projects'], queryFn: projectService.list });

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Track project progress and deadlines"
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Projects' }]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
          : (projects ?? []).map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/app/projects/${p.id}`}>
                  <Card className="h-full transition hover:shadow-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      <Badge variant={statusVariant[p.status]} dot>{p.status.replace('_', ' ')}</Badge>
                    </div>
                    <h3 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">{p.name}</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{p.description}</p>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Progress</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{p.progress}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className={cn('h-full rounded-full', p.progress === 100 ? 'bg-emerald-500' : 'bg-brand-500')} style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                      <AvatarGroup members={p.members} max={3} size="xs" />
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(p.deadline)}
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
      </div>
    </div>
  );
}
