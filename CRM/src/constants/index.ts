export const STORAGE_KEYS = {
  THEME: 'crm_theme',
} as const;

export const QUERY_KEYS = {
  customers: ['customers'] as const,
  leads: ['leads'] as const,
  tasks: ['tasks'] as const,
  projects: ['projects'] as const,
  invoices: ['invoices'] as const,
  messages: ['messages'] as const,
  conversations: ['conversations'] as const,
  notifications: ['notifications'] as const,
  dashboard: ['dashboard'] as const,
  reports: ['reports'] as const,
  activities: ['activities'] as const,
} as const;

export const PAGE_SIZE = 8;
