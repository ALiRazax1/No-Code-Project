import { supabase } from './supabase';
import type { Customer } from '@/types';
import { logActivity } from './activityService';

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: Customer['status'];
  value: number;
  avatar: string | null;
  location: string;
  created_at: string;
  updated_at: string;
  last_contact: string;
}

function toCustomer(r: CustomerRow): Customer {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    company: r.company,
    status: r.status,
    value: Number(r.value),
    avatar: r.avatar ?? undefined,
    location: r.location,
    createdAt: r.created_at,
    lastContact: r.last_contact ?? r.created_at,
  };
}

export const customerService = {
  async list(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as CustomerRow[]).map(toCustomer);
  },

  async get(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toCustomer(data as CustomerRow) : null;
  },

  async create(data: Omit<Customer, 'id' | 'createdAt' | 'lastContact'>): Promise<Customer> {
    const row = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      status: data.status,
      value: data.value,
      avatar: data.avatar ?? null,
      location: data.location,
    };
    const { data: created, error } = await supabase
      .from('customers')
      .insert(row)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    const customer = toCustomer(created as CustomerRow);
    await logActivity('customer', `New customer ${customer.name} added`, customer.name);
    return customer;
  },

  async update(id: string, data: Partial<Customer>): Promise<Customer | null> {
    const row: Record<string, unknown> = {};
    if (data.name !== undefined) row.name = data.name;
    if (data.email !== undefined) row.email = data.email;
    if (data.phone !== undefined) row.phone = data.phone;
    if (data.company !== undefined) row.company = data.company;
    if (data.status !== undefined) row.status = data.status;
    if (data.value !== undefined) row.value = data.value;
    if (data.avatar !== undefined) row.avatar = data.avatar;
    if (data.location !== undefined) row.location = data.location;

    const { data: updated, error } = await supabase
      .from('customers')
      .update(row)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    const customer = updated ? toCustomer(updated as CustomerRow) : null;
    if (customer) await logActivity('customer', `Customer ${customer.name} updated`, customer.name);
    return customer;
  },

  async remove(id: string): Promise<boolean> {
    const { data: existing, error: fetchErr } = await supabase
      .from('customers')
      .select('name')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);

    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw new Error(error.message);
    if (existing) await logActivity('customer', `Customer ${existing.name} deleted`, existing.name);
    return true;
  },
};
