import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Send } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { invoiceService } from '@/services/services';
import { formatCurrency, formatDate } from '@/utils/format';
import type { InvoiceStatus } from '@/types';

const statusVariant: Record<InvoiceStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  paid: 'success', pending: 'warning', overdue: 'danger', draft: 'default',
};

export function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useQuery({ queryKey: ['invoices', id], queryFn: () => invoiceService.get(id!) });

  if (isLoading) return <FullPageSpinner />;
  if (!invoice) return <EmptyState title="Invoice not found" action={<Button onClick={() => navigate('/app/invoices')}>Back</Button>} />;

  const lineItems = [
    { description: 'CRM Platform License (Annual)', amount: Math.round(invoice.amount * 0.6) },
    { description: 'Premium Support Package', amount: Math.round(invoice.amount * 0.25) },
    { description: 'Onboarding & Training', amount: Math.round(invoice.amount * 0.15) },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Invoices', to: '/app/invoices' }, { label: invoice.number }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>Download</Button>
            <Button leftIcon={<Send className="h-4 w-4" />}>Send</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Invoice</p>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{invoice.number}</h2>
            </div>
            <Badge variant={statusVariant[invoice.status]} dot>{invoice.status}</Badge>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-y border-gray-100 py-4 dark:border-gray-800">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Bill To</p>
              <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{invoice.customer}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Issue Date</p>
              <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{formatDate(invoice.issueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
              <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>

          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">Description</th>
                <th className="pb-2 text-right font-medium text-gray-500 dark:text-gray-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-800/50">
                  <td className="py-3 text-gray-700 dark:text-gray-300">{item.description}</td>
                  <td className="py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-4 text-right font-semibold text-gray-900 dark:text-gray-100">Total</td>
                <td className="pt-4 text-right text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(invoice.amount)}</td>
              </tr>
            </tfoot>
          </table>
        </Card>

        <Card>
          <CardHeader title="Payment Details" />
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Status</span><Badge variant={statusVariant[invoice.status]} dot>{invoice.status}</Badge></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Amount</span><span className="font-semibold">{formatCurrency(invoice.amount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Due</span><span>{formatDate(invoice.dueDate)}</span></div>
          </div>
          <Button className="mt-6 w-full" variant={invoice.status === 'paid' ? 'success' : 'primary'} disabled={invoice.status === 'paid'}>
            {invoice.status === 'paid' ? 'Payment Received' : 'Mark as Paid'}
          </Button>
        </Card>
      </div>
    </div>
  );
}
