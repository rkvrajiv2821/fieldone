// src/types/index.ts
// Global type definitions for GZFieldOne

import {
  Role,
  LeadStatus,
  FollowUpStatus,
  Priority,
  NotificationType,
  NotificationChannel,
} from "@prisma/client";

// ─── Re-export Prisma enums ───────────────────────────────────────────────────
export { Role, LeadStatus, FollowUpStatus, Priority, NotificationType, NotificationChannel };

// ─── User Types ───────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  role: Role;
  isActive: boolean;
  canViewAllLeads: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    leads: number;
    followUps: number;
  };
}

// ─── Lead Types ───────────────────────────────────────────────────────────────
export interface LeadWithRelations {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  whatsappNumber?: string | null;
  company?: string | null;
  source?: string | null;
  notes?: string | null;
  status: LeadStatus;
  assignedToId: string;
  assignedTo: Pick<UserProfile, "id" | "name" | "email">;
  followUps?: FollowUpWithRelations[];
  client?: ClientData | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Follow-Up Types ──────────────────────────────────────────────────────────
export interface FollowUpWithRelations {
  id: string;
  scheduledAt: Date;
  notes?: string | null;
  status: FollowUpStatus;
  priority: Priority;
  contactMethod?: string | null;
  purpose?: string | null;
  leadId: string;
  lead: Pick<LeadWithRelations, "id" | "name" | "company" | "phone">;
  assignedToId: string;
  assignedTo: Pick<UserProfile, "id" | "name">;
  completedAt?: Date | null;
  completionNote?: string | null;
  reminderSentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Client Types ─────────────────────────────────────────────────────────────
export interface ClientData {
  id: string;
  convertedAt: Date;
  notes?: string | null;
  leadId: string;
  lead?: LeadWithRelations;
}

// ─── Notification Types ───────────────────────────────────────────────────────
export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  isRead: boolean;
  readAt?: Date | null;
  refId?: string | null;
  refType?: string | null;
  userId: string;
  createdAt: Date;
}

// ─── Dashboard Stats Types ────────────────────────────────────────────────────
export interface DashboardStats {
  totalLeads: number;
  pendingFollowUps: number;
  convertedClients: number;
  todaysCalls: number;
  totalLeadsChange: number;
  pendingFollowUpsChange: number;
  convertedClientsChange: number;
  todaysCallsChange: number;
}

// ─── Report Types ─────────────────────────────────────────────────────────────
export interface ReportFilters {
  managerId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: LeadStatus;
  priority?: Priority;
}

export interface ManagerReport {
  managerId: string;
  managerName: string;
  totalLeads: number;
  activeLeads: number;
  convertedClients: number;
  pendingFollowUps: number;
  completedFollowUps: number;
  overdueFollowUps: number;
  conversionRate: number;
}

// ─── API Response Types ───────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Form Types ───────────────────────────────────────────────────────────────
export interface LeadFormData {
  name: string;
  email?: string;
  phone: string;
  whatsappNumber?: string;
  company?: string;
  source?: string;
  notes?: string;
  assignedToId: string;
}

export interface FollowUpFormData {
  leadId: string;
  scheduledAt: Date;
  notes?: string;
  priority: Priority;
  contactMethod?: string;
}

export interface ManagerFormData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  whatsappNumber?: string;
  canViewAllLeads: boolean;
}

// ─── CSV Import Types ─────────────────────────────────────────────────────────
export interface LeadCSVRow {
  name: string;
  email?: string;
  phone: string;
  whatsapp_number?: string;
  company?: string;
  source?: string;
  notes?: string;
}

// ─── Sidebar Navigation Types ─────────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  roles: Role[];
}
