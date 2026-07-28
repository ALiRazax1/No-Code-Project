import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Building2, DollarSign, Calendar, Clock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { customerService, activityService } from '@/services/services';
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/format';

export function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useQuery({ queryKey: QUERY_KEYS_CUSTOMERS(id!), queryFn: () => customerService.get(id!) });
  const { data: activities } = useQuery({ queryKey: QUERY_KEYS_ACTIVITIES, queryFn: activityService.list });

  if (isLoading) return <FullPageSpinner />;
  if (!customer) {
    return (
      <EmptyState
        icon={<Building2 className="h-6 w-6" />}
        title="Customer not found"
        description="The customer you're looking for doesn't exist or has been removed."
        action={<Button onClick={() => navigate('/app/customers')}>Back to customers</Button>}
      />
    );
  }

  const info = [
    { icon: Mail, label: 'Email', value: customer.email },
    { icon: Phone, label: 'Phone', value: customer.phone },
    { icon: Building2, label: 'Company', value: customer.company },
    { icon: MapPin, label: 'Location', value: customer.location },
    { icon: DollarSign, label: 'Lifetime Value', value: formatCurrency(customer.value) },
    { icon: Calendar, label: 'Customer Since', value: formatDate(customer.createdAt) },
    { icon: Clock, label: 'Last Contact', value: formatRelativeTime(customer.lastContact) },
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Customers', to: '/app/customers' }, { label: customer.name }]}
        actions={<Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/app/customers')}>Back</Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <Avatar name={customer.name} size="lg" className="h-20 w-20 text-2xl" />
            <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">{customer.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{customer.company}</p>
            <Badge className="mt-3" variant={customer.status === 'active' ? 'success' : customer.status === 'lead' ? 'warning' : 'default'} dot>
              {customer.status}
            </Badge>
          </div>
          <div className="mt-6 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-800">
            {info.map((i) => (
              <div key={i.label} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <i.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{i.label}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{i.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Activity Timeline" subtitle="Recent interactions with this customer" />
            <div className="space-y-4">
              {(activities ?? []).slice(0, 5).map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{a.description}</p>
                    <p className="text-xs text-gray-400">{a.user} · {formatRelativeTime(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Quick Actions" />
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">Send Email</Button>
              <Button variant="outline">Create Task</Button>
              <Button variant="outline">New Invoice</Button>
              <Link to="/app/messages"><Button>Send Message</Button></Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const QUERY_KEYS_CUSTOMERS = (id: string) => ['customers', id] as const;
const QUERY_KEYS_ACTIVITIES = ['activities'] as const;
