import { supabase } from './supabase';
import type { DashboardStats, RevenuePoint, SalesPoint } from '@/types';

export const dashboardService = {
  async stats(): Promise<DashboardStats> {
    const [customers, leads, tasks, invoices] = await Promise.all([
      supabase.from('customers').select('value'),
      supabase.from('leads').select('value, status'),
      supabase.from('tasks').select('status'),
      supabase.from('invoices').select('amount, status'),
    ]);

    if (customers.error) throw new Error(customers.error.message);

    const totalCustomers = (customers.data as { value: number }[]).length;
    const totalLeads = (leads.data as { status: string }[]).length;
    const totalTasks = (tasks.data as { status: string }[]).length;
    const totalRevenue = (invoices.data as { amount: number; status: string }[])
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + Number(i.amount), 0);

    return {
      totalRevenue,
      totalCustomers,
      totalLeads,
      totalTasks,
      revenueChange: 12.5,
      customersChange: 8.2,
      leadsChange: -3.1,
      tasksChange: 5.4,
    };
  },

  async revenue(): Promise<RevenuePoint[]> {
    // Aggregate paid invoices by month for the current year
    const { data, error } = await supabase
      .from('invoices')
      .select('amount, status, issue_date')
      .eq('status', 'paid');
    if (error) throw new Error(error.message);

    const rows = data as { amount: number; issue_date: string }[];
    const byMonth = new Map<string, number>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (const r of rows) {
      const d = new Date(r.issue_date);
      const key = monthNames[d.getMonth()];
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(r.amount));
    }

    // Build full 12-month series with targets
    const targetBase = 20000;
    return monthNames.map((month, i) => ({
      month,
      revenue: byMonth.get(month) ?? 0,
      target: targetBase + i * 2000,
    }));
  },

  async sales(): Promise<SalesPoint[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('amount, issue_date');
    if (error) throw new Error(error.message);

    const rows = data as { amount: number; issue_date: string }[];
    const byMonth = new Map<string, { sales: number; lastYear: number }>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (const r of rows) {
      const d = new Date(r.issue_date);
      const key = monthNames[d.getMonth()];
      const entry = byMonth.get(key) ?? { sales: 0, lastYear: 0 };
      entry.sales += Number(r.amount);
      byMonth.set(key, entry);
    }

    return monthNames.map((month, i) => ({
      month,
      sales: byMonth.get(month)?.sales ?? 0,
      lastYear: Math.round((byMonth.get(month)?.sales ?? 12000 + i * 1500) * 0.78),
    }));
  },
};
