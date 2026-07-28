import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  DollarSign, Users, UserPlus, CheckSquare, ArrowUpRight, ArrowDownRight, Activity as ActivityIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { dashboardService, customerService, taskService, activityService } from '@/services/services';
import { formatCurrency, formatNumber, formatRelativeTime } from '@/utils/format';
import { useTheme } from '@/context/ThemeContext';
import type { Activity } from '@/types';

const activityIcon: Record<Activity['type'], { icon: typeof Users; color: string }> = {
  customer: { icon: Users, color: 'bg-brand-100 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400' },
  lead: { icon: UserPlus, color: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' },
  task: { icon: CheckSquare, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' },
  project: { icon: ActivityIcon, color: 'bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400' },
  invoice: { icon: DollarSign, color: 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' },
};

export function DashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const grid = isDark ? '#1f2937' : '#e5e7eb';
  const axis = isDark ? '#9ca3af' : '#6b7280';

  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: dashboardService.stats });
  const { data: revenue } = useQuery({ queryKey: ['dashboard', 'revenue'], queryFn: dashboardService.revenue });
  const { data: sales } = useQuery({ queryKey: ['dashboard', 'sales'], queryFn: dashboardService.sales });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: customerService.list });
  const { data: tasks } = useQuery({ queryKey: ['tasks'], queryFn: taskService.list });
  const { data: activities, isLoading: actLoading } = useQuery({ queryKey: ['activities'], queryFn: activityService.list });

  const statCards = [
    { label: 'Total Revenue', value: stats ? formatCurrency(stats.totalRevenue) : '—', change: stats?.revenueChange, icon: DollarSign, color: 'bg-brand-500' },
    { label: 'Total Customers', value: stats ? formatNumber(stats.totalCustomers) : '—', change: stats?.customersChange, icon: Users, color: 'bg-emerald-500' },
    { label: 'Total Leads', value: stats ? formatNumber(stats.totalLeads) : '—', change: stats?.leadsChange, icon: UserPlus, color: 'bg-amber-500' },
    { label: 'Total Tasks', value: stats ? formatNumber(stats.totalTasks) : '—', change: stats?.tasksChange, icon: CheckSquare, color: 'bg-sky-500' },
  ];

  const recentCustomers = (customers ?? []).slice(0, 5);
  const upcomingTasks = (tasks ?? []).filter((t) => t.status !== 'done').slice(0, 5);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Welcome back! Here's what's happening with your business." />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s, i) =>
          statsLoading ? (
            <CardSkeleton key={i} />
          ) : (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.color} text-white shadow-lg`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  {s.change !== undefined && (
                    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${s.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {s.change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {Math.abs(s.change)}%
                    </span>
                  )}
                </div>
                <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              </Card>
            </motion.div>
          ),
        )}
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Revenue Overview" subtitle="Monthly revenue vs target" />
          <div className="h-72">
            {revenue ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3366ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3366ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                  <XAxis dataKey="month" stroke={axis} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={axis} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#111827' : '#fff', color: isDark ? '#f3f4f6' : '#111827', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.2)' }}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                  <Area type="monotone" dataKey="target" stroke="#9ca3af" strokeDasharray="4 4" fill="none" strokeWidth={2} />
                  <Area type="monotone" dataKey="revenue" stroke="#3366ff" fill="url(#revGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center"><Spinner /></div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Monthly Sales" subtitle="This year vs last year" />
          <div className="h-72">
            {sales ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sales} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                  <XAxis dataKey="month" stroke={axis} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={axis} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#111827' : '#fff', color: isDark ? '#f3f4f6' : '#111827', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.2)' }}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="lastYear" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Last year" />
                  <Bar dataKey="sales" fill="#3366ff" radius={[4, 4, 0, 0]} name="This year" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center"><Spinner /></div>
            )}
          </div>
        </Card>
      </div>

      {/* Activity + lists */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Recent Activity" subtitle="Latest updates across your workspace" />
          {actLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (activities ?? []).length === 0 ? (
            <EmptyState icon={<ActivityIcon className="h-6 w-6" />} title="No activity yet" />
          ) : (
            <div className="space-y-4">
              {(activities ?? []).slice(0, 6).map((a) => {
                const Icon = activityIcon[a.type].icon;
                return (
                  <div key={a.id} className="flex gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${activityIcon[a.type].color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{a.description}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {a.user} · {formatRelativeTime(a.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title="Recent Customers" subtitle="Newest additions" />
          <div className="space-y-1">
            {recentCustomers.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <Avatar name={c.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{c.company}</p>
                </div>
                <Badge variant={c.status === 'active' ? 'success' : c.status === 'lead' ? 'warning' : 'default'}>
                  {c.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader title="Upcoming Tasks" subtitle="Tasks due soon" />
          <div className="space-y-1">
            {upcomingTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className={`h-2 w-2 shrink-0 rounded-full ${t.priority === 'urgent' ? 'bg-red-500' : t.priority === 'high' ? 'bg-amber-500' : 'bg-sky-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{t.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.assignee}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">{formatRelativeTime(t.dueDate)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
