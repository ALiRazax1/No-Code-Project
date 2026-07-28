import { supabase } from './supabase';
import type { Lead } from '@/types';
import { logActivity } from './activityService';

interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: Lead['status'];
  value: number;
  owner: string;
  created_at: string;
  updated_at: string;
}

function toLead(r: LeadRow): Lead {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    company: r.company,
    source: r.source,
    status: r.status,
    value: Number(r.value),
    owner: r.owner,
    createdAt: r.created_at,
  };
}

export const leadService = {
  async list(): Promise<Lead[]> {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as LeadRow[]).map(toLead);
  },

  async create(data: Omit<Lead, 'id' | 'createdAt'>): Promise<Lead> {
    const row = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      source: data.source,
      status: data.status,
      value: data.value,
      owner: data.owner,
    };
    const { data: created, error } = await supabase
      .from('leads')
      .insert(row)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    const lead = toLead(created as LeadRow);
    await logActivity('lead', `New lead ${lead.name} created`, lead.owner);
    return lead;
  },

  async update(id: string, data: Partial<Lead>): Promise<Lead | null> {
    const row: Record<string, unknown> = {};
    if (data.name !== undefined) row.name = data.name;
    if (data.email !== undefined) row.email = data.email;
    if (data.phone !== undefined) row.phone = data.phone;
    if (data.company !== undefined) row.company = data.company;
    if (data.source !== undefined) row.source = data.source;
    if (data.status !== undefined) row.status = data.status;
    if (data.value !== undefined) row.value = data.value;
    if (data.owner !== undefined) row.owner = data.owner;

    const { data: updated, error } = await supabase
      .from('leads')
      .update(row)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    const lead = updated ? toLead(updated as LeadRow) : null;
    if (lead) await logActivity('lead', `Lead ${lead.name} updated`, lead.owner);
    return lead;
  },

  async remove(id: string): Promise<boolean> {
    const { data: existing, error: fetchErr } = await supabase
      .from('leads')
      .select('name')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);

    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw new Error(error.message);
    if (existing) await logActivity('lead', `Lead ${existing.name} deleted`, '');
    return true;
  },

  async convert(id: string): Promise<Lead | null> {
    // Mark lead as won
    const { data: updated, error } = await supabase
      .from('leads')
      .update({ status: 'won' })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    const lead = updated ? toLead(updated as LeadRow) : null;

    if (lead) {
      // Create a customer from the lead
      const { error: custErr } = await supabase.from('customers').insert({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        status: 'active',
        value: lead.value,
        location: 'Unknown',
      });
      if (custErr) throw new Error(custErr.message);
      await logActivity('lead', `Lead ${lead.name} converted to customer`, lead.owner);
    }
    return lead;
  },
};
