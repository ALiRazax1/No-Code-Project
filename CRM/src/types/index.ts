export type ID = string;

export interface User {
  id: ID;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'agent';
}

export type CustomerStatus = 'active' | 'inactive' | 'lead';

export interface Customer {
  id: ID;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: CustomerStatus;
  value: number;
  avatar?: string;
  location: string;
  createdAt: string;
  lastContact: string;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost' | 'won';

export interface Lead {
  id: ID;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: LeadStatus;
  value: number;
  owner: string;
  createdAt: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface Task {
  id: ID;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  dueDate: string;
  projectId?: ID;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';

export interface ProjectMember {
  id: ID;
  name: string;
  role: string;
  avatar?: string;
}

export interface Project {
  id: ID;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  deadline: string;
  members: ProjectMember[];
  tasksCount: number;
  completedTasks: number;
}

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft';

export interface Invoice {
  id: ID;
  number: string;
  customer: string;
  amount: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
}

export interface Message {
  id: ID;
  conversationId: ID;
  senderId: ID;
  senderName: string;
  senderAvatar?: string;
  content: string;
  createdAt: string;
  outgoing: boolean;
}

export interface Conversation {
  id: ID;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  online: boolean;
}

export interface Activity {
  id: ID;
  type: 'customer' | 'lead' | 'task' | 'project' | 'invoice';
  description: string;
  user: string;
  createdAt: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalCustomers: number;
  totalLeads: number;
  totalTasks: number;
  revenueChange: number;
  customersChange: number;
  leadsChange: number;
  tasksChange: number;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  target: number;
}

export interface SalesPoint {
  month: string;
  sales: number;
  lastYear: number;
}
