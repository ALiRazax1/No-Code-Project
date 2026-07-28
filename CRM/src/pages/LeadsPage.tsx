import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, MoreHorizontal, Pencil, Trash2, UserCheck, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/Dropdown';
import { leadService } from '@/services/services';
import { QUERY_KEYS } from '@/constants';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Lead, LeadStatus } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(1, 'Phone is required'),
  company: z.string().min(1, 'Company is required'),
  source: z.string().min(1, 'Source is required'),
  status: z.enum(['new', 'contacted', 'qualified', 'lost', 'won']),
  value: z.coerce.number().min(0),
  owner: z.string().min(1, 'Owner is required'),
});
type FormData = z.infer<typeof schema>;

const statusVariant: Record<LeadStatus, 'default' | 'info' | 'warning' | 'danger' | 'success' | 'brand'> = {
  new: 'info',
  contacted: 'warning',
  qualified: 'brand',
  lost: 'danger',
  won: 'success',
};

export function LeadsPage() {
  const qc = useQueryClient();
  const { data: leads, isLoading } = useQuery({ queryKey: QUERY_KEYS.leads, queryFn: leadService.list });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [convertTarget, setConvertTarget] = useState<Lead | null>(null);

  const createMut = useMutation({ mutationFn: leadService.create, onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.leads }); toast.success('Lead created'); setModalOpen(false); } });
  const updateMut = useMutation({ mutationFn: (a: { id: string; data: Partial<Lead> }) => leadService.update(a.id, a.data), onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.leads }); toast.success('Lead updated'); setModalOpen(false); } });
  const deleteMut = useMutation({ mutationFn: leadService.remove, onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.leads }); toast.success('Lead deleted'); setDeleteTarget(null); } });
  const convertMut = useMutation({ mutationFn: leadService.convert, onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.leads }); qc.invalidateQueries({ queryKey: QUERY_KEYS.customers }); toast.success('Lead converted to customer'); setConvertTarget(null); } });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const openAdd = () => { setEditing(null); reset({ name: '', email: '', phone: '', company: '', source: 'Website', status: 'new', value: 0, owner: '' }); setModalOpen(true); };
  const openEdit = (l: Lead) => { setEditing(l); reset({ name: l.name, email: l.email, phone: l.phone, company: l.company, source: l.source, status: l.status, value: l.value, owner: l.owner }); setModalOpen(true); };
  const onSubmit = (data: FormData) => editing ? updateMut.mutate({ id: editing.id, data }) : createMut.mutate(data);

  const columns: Column<Lead>[] = [
    { key: 'name', header: 'Lead', sortable: true, sortValue: (l) => l.name, render: (l) => (<div><p className="font-medium text-gray-900 dark:text-gray-100">{l.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{l.email}</p></div>) },
    { key: 'company', header: 'Company', sortable: true, sortValue: (l) => l.company, render: (l) => l.company },
    { key: 'source', header: 'Source', render: (l) => <span className="text-gray-600 dark:text-gray-400">{l.source}</span> },
    { key: 'status', header: 'Status', sortable: true, sortValue: (l) => l.status, render: (l) => <Badge variant={statusVariant[l.status]} dot>{l.status}</Badge> },
    { key: 'value', header: 'Value', sortable: true, sortValue: (l) => l.value, render: (l) => <span className="font-semibold">{formatCurrency(l.value)}</span> },
    { key: 'owner', header: 'Owner', render: (l) => <span className="text-gray-600 dark:text-gray-400">{l.owner}</span> },
    { key: 'createdAt', header: 'Created', sortable: true, sortValue: (l) => l.createdAt, render: (l) => <span className="text-gray-600 dark:text-gray-400">{formatDate(l.createdAt)}</span> },
  ];

  const won = (leads ?? []).filter((l) => l.status === 'won').length;
  const qualified = (leads ?? []).filter((l) => l.status === 'qualified').length;
  const total = leads?.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Track and convert your sales leads"
        breadcrumbs={[{ label: 'Dashboard', to: '/app' }, { label: 'Leads' }]}
        actions={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={openAdd}>Add Lead</Button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Leads</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{total}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Qualified</p>
          <p className="mt-1 text-2xl font-bold text-brand-600 dark:text-brand-400">{qualified}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Won</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{won}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={leads ?? []}
        loading={isLoading}
        rowKey={(l) => l.id}
        searchPlaceholder="Search leads…"
        emptyTitle="No leads yet"
        emptyIcon={<TrendingUp className="h-6 w-6" />}
        actions={(l) => (
          <Dropdown trigger={<span className="inline-flex rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><MoreHorizontal className="h-4 w-4" /></span>}>
            <DropdownItem icon={<UserCheck className="h-4 w-4" />} onClick={() => setConvertTarget(l)}>Convert to Customer</DropdownItem>
            <DropdownItem icon={<Pencil className="h-4 w-4" />} onClick={() => openEdit(l)}>Edit</DropdownItem>
            <DropdownDivider />
            <DropdownItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleteTarget(l)}>Delete</DropdownItem>
          </Dropdown>
        )}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Lead' : 'Add Lead'}
        size="lg"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)} loading={createMut.isPending || updateMut.isPending}>{editing ? 'Save' : 'Add'}</Button></>}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Name" error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
          <Input label="Company" error={errors.company?.message} {...register('company')} />
          <Input label="Source" placeholder="Website, Referral…" error={errors.source?.message} {...register('source')} />
          <Select label="Status" options={[{ value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' }, { value: 'qualified', label: 'Qualified' }, { value: 'lost', label: 'Lost' }, { value: 'won', label: 'Won' }]} {...register('status')} />
          <Input label="Owner" error={errors.owner?.message} {...register('owner')} />
          <Input label="Value (USD)" type="number" error={errors.value?.message} {...register('value')} />
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)} loading={deleteMut.isPending} title="Delete lead?" message={`Remove ${deleteTarget?.name}? This cannot be undone.`} confirmLabel="Delete" />
      <ConfirmDialog open={!!convertTarget} onClose={() => setConvertTarget(null)} onConfirm={() => convertTarget && convertMut.mutate(convertTarget.id)} loading={convertMut.isPending} danger={false} title="Convert to customer?" message={`${convertTarget?.name} will become an active customer.`} confirmLabel="Convert" />
    </div>
  );
}
