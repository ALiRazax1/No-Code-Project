import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Users, DollarSign, CheckSquare } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { dashboardService, customerService, leadService, taskService } from '@/services/services';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency } from '@/utils/format';

const PIE_COLORS = ['#3366ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function ReportsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const grid = isDark ? '#1f2937' : '#e5e7eb';
  const axis = isDark ? '#9ca3af' : '#6b7280';

  const { data: revenue } = useQuery({ queryKey: ['dashboard', 'revenue'], queryFn: dashboardService.revenue });
  const { data: sales } = useQuery({ queryKey: ['dashboard', 'sales'], queryFn: dashboardService.sales });
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: customerService.list });
  const { data: leads } = useQuery({ queryKey: ['leads'], queryFn: leadService.list });
  const { data: tasks } = useQuery({ queryKey: ['tasks'], queryFn: taskService.list });

  const customerByStatus = [
    { name: 'Active', value: (customers ?? []).filter((c) => c.status === 'active').length },
    { name: 'Inactive', value: (customers ?? []).filter((c) => c.status === 'inactive').length },
    { name: 'Lead', value: (customers ?? []).filter((c) => c.status === 'lead').length },
  ].filter((d) => d.value > 0);

  const leadsByStatus = [
    { name: 'New', value: (leads ?? []).filter((l) => l.status === 'new').length },
    { name: 'Contacted', value: (leads ?? []).filter((l) => l.status === 'contacted').length },
    { name: 'Qualified', value: (leads ?? []).filter((l) => l.status === 'qualified').length },
    { name: 'Won', value: (leads ?? []).filter((l) => l.status === 'won').length },
    { name: 'Lost', value: (leads ?? []).filter((l) => l.status === 'lost').length },
  ].filter((d) => d.value > 0);

  const tasksByStatus = [
    { name: 'To Do', count: (tasks ?? []).filter((t) => t.status === 'todo').length },
    { name: 'In Progress', count: (tasks ?? []).filter((t) => t.status === 'in_progress').length },
    { name: 'Review', count: (tasks ?? []).filter((t) => t.status === 'review').length },
    { name: 'Done', count: (tasks ?? []).filter((t) => t.status === 'done').length },
  ];

  const summary = [
    { label: 'Revenue (YTD)', value: formatCurrency((revenue ?? []).reduce((s, r) => s + r.revenue, 0)), icon: DollarSign, color: 'bg-brand-500' },
    { label: 'Customers', value: (customers ?? []).length, icon: Users, color: 'bg-emerald-500' },
    { label: 'Leads', value: (leads ?? []).length, icon: TrendingUp, color: 'bg-amber-500' },
    { label: 'Tasks', value: (tasks ?? []).length, icon: CheckSquare, color: 'bg-sky-500' },
  ];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Analytics and insights for your business" breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Reports' }]} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color} text-white`}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Revenue Trend" subtitle="Monthly revenue over the year" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenue ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey="month" stroke={axis} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={axis} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#111827' : '#fff', color: isDark ? '#f3f4f6' : '#111827' }} formatter={(v) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="#3366ff" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="target" stroke="#9ca3af" strokeDasharray="4 4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Sales Comparison" subtitle="This year vs last year" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sales ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey="month" stroke={axis} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={axis} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#111827' : '#fff', color: isDark ? '#f3f4f6' : '#111827' }} formatter={(v) => formatCurrency(Number(v))} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="lastYear" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Last year" />
                <Bar dataKey="sales" fill="#3366ff" radius={[4, 4, 0, 0]} name="This year" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Customers by Status" subtitle="Distribution of customer statuses" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={customerByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {customerByStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#111827' : '#fff', color: isDark ? '#f3f4f6' : '#111827' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Leads Pipeline" subtitle="Leads by stage" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={leadsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={2}>
                  {leadsByStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#111827' : '#fff', color: isDark ? '#f3f4f6' : '#111827' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Tasks by Status" subtitle="Workload distribution" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tasksByStatus} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
              <XAxis type="number" stroke={axis} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke={axis} fontSize={12} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#111827' : '#fff', color: isDark ? '#f3f4f6' : '#111827' }} />
              <Bar dataKey="count" fill="#3366ff" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
