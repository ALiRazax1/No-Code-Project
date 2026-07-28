import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { invoiceService } from '@/services/services';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Invoice, InvoiceStatus } from '@/types';

const statusVariant: Record<InvoiceStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  paid: 'success', pending: 'warning', overdue: 'danger', draft: 'default',
};

export function InvoicesPage() {
  const navigate = useNavigate();
  const { data: invoices, isLoading } = useQuery({ queryKey: ['invoices'], queryFn: invoiceService.list });
  const [filter, setFilter] = useState('all');

  const filtered = (invoices ?? []).filter((i) => filter === 'all' || i.status === filter);

  const total = (invoices ?? []).reduce((s, i) => s + i.amount, 0);
  const paid = (invoices ?? []).filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const pending = (invoices ?? []).filter((i) => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
  const overdue = (invoices ?? []).filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);

  const stats = [
    { label: 'Total Billed', value: formatCurrency(total), icon: FileText, color: 'bg-brand-500' },
    { label: 'Paid', value: formatCurrency(paid), icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'Pending', value: formatCurrency(pending), icon: Clock, color: 'bg-amber-500' },
    { label: 'Overdue', value: formatCurrency(overdue), icon: AlertCircle, color: 'bg-red-500' },
  ];

  const columns: Column<Invoice>[] = [
    { key: 'number', header: 'Invoice #', sortable: true, sortValue: (i) => i.number, render: (i) => <span className="font-medium text-brand-600 dark:text-brand-400">{i.number}</span> },
    { key: 'customer', header: 'Customer', sortable: true, sortValue: (i) => i.customer, render: (i) => i.customer },
    { key: 'amount', header: 'Amount', sortable: true, sortValue: (i) => i.amount, render: (i) => <span className="font-semibold">{formatCurrency(i.amount)}</span> },
    { key: 'status', header: 'Status', sortable: true, sortValue: (i) => i.status, render: (i) => <Badge variant={statusVariant[i.status]} dot>{i.status}</Badge> },
    { key: 'issueDate', header: 'Issued', sortable: true, sortValue: (i) => i.issueDate, render: (i) => <span className="text-gray-600 dark:text-gray-400">{formatDate(i.issueDate)}</span> },
    { key: 'dueDate', header: 'Due', sortable: true, sortValue: (i) => i.dueDate, render: (i) => <span className="text-gray-600 dark:text-gray-400">{formatDate(i.dueDate)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Manage billing and payments"
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Invoices' }]}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color} text-white`}>
                <s.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        rowKey={(i) => i.id}
        onRowClick={(i) => navigate(`/app/invoices/${i.id}`)}
        searchPlaceholder="Search invoices…"
        emptyIcon={<FileText className="h-6 w-6" />}
        toolbar={
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-base h-9 w-auto">
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="draft">Draft</option>
          </select>
        }
      />
    </div>
  );
}
