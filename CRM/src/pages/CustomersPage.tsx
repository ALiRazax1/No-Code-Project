import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, MoreHorizontal, Pencil, Trash2, Eye, Users, Filter } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/Dropdown';
import { customerService } from '@/services/services';
import { QUERY_KEYS } from '@/constants';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Customer, CustomerStatus } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(1, 'Phone is required'),
  company: z.string().min(1, 'Company is required'),
  location: z.string().min(1, 'Location is required'),
  status: z.enum(['active', 'inactive', 'lead']),
  value: z.coerce.number().min(0, 'Value must be positive'),
});
type FormData = z.infer<typeof schema>;

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'lead', label: 'Lead' },
];

export function CustomersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: customers, isLoading } = useQuery({ queryKey: QUERY_KEYS.customers, queryFn: customerService.list });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const createMut = useMutation({ mutationFn: customerService.create, onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.customers }); toast.success('Customer added'); setModalOpen(false); } });
  const updateMut = useMutation({ mutationFn: (args: { id: string; data: Partial<Customer> }) => customerService.update(args.id, args.data), onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.customers }); toast.success('Customer updated'); setModalOpen(false); } });
  const deleteMut = useMutation({ mutationFn: customerService.remove, onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.customers }); toast.success('Customer deleted'); setDeleteTarget(null); } });

  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const openAdd = () => { setEditing(null); reset({ name: '', email: '', phone: '', company: '', location: '', status: 'active', value: 0 }); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); reset({ name: c.name, email: c.email, phone: c.phone, company: c.company, location: c.location, status: c.status, value: c.value }); setModalOpen(true); };

  const onSubmit = (data: FormData) => {
    if (editing) updateMut.mutate({ id: editing.id, data });
    else createMut.mutate(data);
  };

  const filtered = (customers ?? []).filter((c) => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.company.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<Customer>[] = [
    {
      key: 'name', header: 'Customer', sortable: true, sortValue: (c) => c.name,
      render: (c) => (
        <div className="flex items-center gap-3">
          <Avatar name={c.name} size="sm" />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{c.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{c.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'company', header: 'Company', sortable: true, sortValue: (c) => c.company, render: (c) => c.company },
    { key: 'location', header: 'Location', render: (c) => <span className="text-gray-600 dark:text-gray-400">{c.location}</span> },
    {
      key: 'status', header: 'Status', sortable: true, sortValue: (c) => c.status,
      render: (c) => <Badge variant={c.status === 'active' ? 'success' : c.status === 'lead' ? 'warning' : 'default'} dot>{c.status}</Badge>,
    },
    { key: 'value', header: 'Value', sortable: true, sortValue: (c) => c.value, render: (c) => <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(c.value)}</span> },
    { key: 'createdAt', header: 'Joined', sortable: true, sortValue: (c) => c.createdAt, render: (c) => <span className="text-gray-600 dark:text-gray-400">{formatDate(c.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Manage your customer relationships"
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Customers' }]}
        actions={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={openAdd}>Add Customer</Button>}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        rowKey={(c) => c.id}
        onRowClick={(c) => navigate(`/app/customers/${c.id}`)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search customers…"
        emptyTitle="No customers found"
        emptyDescription="Try adjusting your search or filters, or add a new customer."
        emptyIcon={<Users className="h-6 w-6" />}
        toolbar={
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-base h-9 w-auto">
              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        }
        actions={(c) => (
          <Dropdown trigger={<span className="inline-flex rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><MoreHorizontal className="h-4 w-4" /></span>}>
            <DropdownItem icon={<Eye className="h-4 w-4" />} onClick={() => navigate(`/app/customers/${c.id}`)}>View</DropdownItem>
            <DropdownItem icon={<Pencil className="h-4 w-4" />} onClick={() => openEdit(c)}>Edit</DropdownItem>
            <DropdownDivider />
            <DropdownItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleteTarget(c)}>Delete</DropdownItem>
          </Dropdown>
        )}
      />

      {/* Add/Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Customer' : 'Add Customer'}
        description={editing ? 'Update customer information' : 'Create a new customer record'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting || createMut.isPending || updateMut.isPending}>
              {editing ? 'Save changes' : 'Add customer'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Full name" placeholder="John Doe" error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" placeholder="john@company.com" error={errors.email?.message} {...register('email')} />
          <Input label="Phone" placeholder="+1 555 0100" error={errors.phone?.message} {...register('phone')} />
          <Input label="Company" placeholder="Acme Corp" error={errors.company?.message} {...register('company')} />
          <Input label="Location" placeholder="New York, US" error={errors.location?.message} {...register('location')} />
          <Select label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'lead', label: 'Lead' }]} error={errors.status?.message} {...register('status')} />
          <Input label="Value (USD)" type="number" placeholder="0" error={errors.value?.message} {...register('value')} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        loading={deleteMut.isPending}
        title="Delete customer?"
        message={`This will permanently remove ${deleteTarget?.name}. This action cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
