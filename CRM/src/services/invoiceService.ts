import { supabase } from './supabase';
import type { Invoice } from '@/types';
import { logActivity } from './activityService';

interface InvoiceRow {
  id: string;
  customer_id: string;
  number: string;
  customer_name: string;
  amount: number;
  status: Invoice['status'];
  issue_date: string;
  due_date: string;
  created_at: string;
  updated_at: string;
}

function toInvoice(r: InvoiceRow): Invoice {
  return {
    id: r.id,
    number: r.number,
    customer: r.customer_name || r.customer_id,
    amount: Number(r.amount),
    status: r.status,
    issueDate: r.issue_date,
    dueDate: r.due_date,
  };
}

export const invoiceService = {
  async list(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as InvoiceRow[]).map(toInvoice);
  },

  async get(id: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toInvoice(data as InvoiceRow) : null;
  },

  async create(data: { customerId: string; customerName: string; number: string; amount: number; status: Invoice['status']; issueDate: string; dueDate: string }): Promise<Invoice> {
    const row = {
      customer_id: data.customerId,
      customer_name: data.customerName,
      number: data.number,
      amount: data.amount,
      status: data.status,
      issue_date: data.issueDate,
      due_date: data.dueDate,
    };
    const { data: created, error } = await supabase
      .from('invoices')
      .insert(row)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    const invoice = toInvoice(created as InvoiceRow);
    await logActivity('invoice', `Invoice ${invoice.number} created`, '');
    return invoice;
  },

  async update(id: string, data: Partial<Invoice>): Promise<Invoice | null> {
    const row: Record<string, unknown> = {};
    if (data.status !== undefined) row.status = data.status;
    if (data.amount !== undefined) row.amount = data.amount;
    if (data.dueDate !== undefined) row.due_date = data.dueDate;
    if (data.issueDate !== undefined) row.issue_date = data.issueDate;

    const { data: updated, error } = await supabase
      .from('invoices')
      .update(row)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    const invoice = updated ? toInvoice(updated as InvoiceRow) : null;
    if (invoice && data.status === 'paid') {
      await logActivity('invoice', `Invoice ${invoice.number} marked as paid`, '');
    }
    return invoice;
  },

  async remove(id: string): Promise<boolean> {
    const { data: existing, error: fetchErr } = await supabase
      .from('invoices')
      .select('number')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);

    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw new Error(error.message);
    if (existing) await logActivity('invoice', `Invoice ${existing.number} deleted`, '');
    return true;
  },
};
