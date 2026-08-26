// src/lib/validations.ts
// Zod schemas for form and API validation

import { z } from "zod";
import { LeadStatus, FollowUpStatus, Priority, Role } from "@prisma/client";

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ─── Manager ──────────────────────────────────────────────────────────────────
export const createManagerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)/,
      "Password must contain at least one letter and one number"
    ),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  canViewAllLeads: z.boolean(),
});
export type CreateManagerInput = z.infer<typeof createManagerSchema>;

export const updateManagerSchema = createManagerSchema.partial().omit({ password: true }).extend({
  isActive: z.boolean().optional(),
});
export type UpdateManagerInput = z.infer<typeof updateManagerSchema>;

// ─── Lead ─────────────────────────────────────────────────────────────────────
const tenDigitPhone = (label: string) =>
  z.string().regex(/^\d{10}$/, `${label} must be exactly 10 digits`);
const optionalTenDigitPhone = (label: string) =>
  tenDigitPhone(label).optional().or(z.literal(""));

export const createLeadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: tenDigitPhone("Owner phone"),
  whatsappNumber: optionalTenDigitPhone("WhatsApp number"),
  company: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000, "Notes too long").optional().or(z.literal("")),
  assignedToId: z.string().min(1, "Please select a manager"),
  ownerPhoto:   z.string().optional().or(z.literal("")),
  managerName:  z.string().min(1, "Name is required").max(100),
  managerPhone: tenDigitPhone("Phone number"),
  managerPhoto: z.string().optional().or(z.literal("")),
  staffType:    z.string().min(1, "Please select a staff type"),
  companyImage: z.string().optional().or(z.literal("")),
  address:      z.string().optional().or(z.literal("")),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = createLeadSchema.partial().extend({
  status:       z.nativeEnum(LeadStatus).optional(),
  name:         z.string().min(2, "Name must be at least 2 characters").max(100),
  phone:        tenDigitPhone("Owner phone"),
  assignedToId: z.string().min(1, "Please select a manager"),
  managerName:  z.string().min(1, "Name is required").max(100),
  managerPhone: tenDigitPhone("Phone number"),
  staffType:    z.string().min(1, "Please select a staff type"),
});
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

// ─── Staff Type ───────────────────────────────────────────────────────────────
export const createStaffTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});
export type CreateStaffTypeInput = z.infer<typeof createStaffTypeSchema>;

// ─── Source ───────────────────────────────────────────────────────────────────
export const createSourceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});
export type CreateSourceInput = z.infer<typeof createSourceSchema>;

// ─── Follow-up ────────────────────────────────────────────────────────────────
export const createFollowUpSchema = z.object({
  leadId: z.string().min(1, "Lead is required"),
  scheduledAt: z.coerce.date({
    errorMap: () => ({ message: "Please select a valid date and time" }),
  }).refine((date) => date > new Date(), {
    message: "Follow-up must be scheduled in the future",
  }),
  notes: z.string().max(1000).optional().or(z.literal("")),
  priority: z.nativeEnum(Priority),
  contactMethod: z.string().optional().or(z.literal("")),
  purpose: z.string().max(100).optional().or(z.literal("")),
});
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;

// ─── Follow-up Purpose ────────────────────────────────────────────────────────
export const createFollowUpPurposeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});
export type CreateFollowUpPurposeInput = z.infer<typeof createFollowUpPurposeSchema>;

export const updateFollowUpSchema = createFollowUpSchema.partial().extend({
  status: z.nativeEnum(FollowUpStatus).optional(),
  completionNote: z.string().optional(),
});
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;

// ─── CSV Import ───────────────────────────────────────────────────────────────
export const csvLeadRowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")).or(z.undefined()),
  phone: z.string().min(10, "Phone required"),
  whatsapp_number: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
});
export type CsvLeadRow = z.infer<typeof csvLeadRowSchema>;

// ─── Blocked Numbers ────────────────────────────────────────────────────────────
export const createBlockedNumberSchema = z.object({
  phone: z.string().min(10, "Enter a valid phone number"),
  reason: z.string().max(200).optional().or(z.literal("")),
});
export type CreateBlockedNumberInput = z.infer<typeof createBlockedNumberSchema>;

// ─── Report Filters ───────────────────────────────────────────────────────────
export const reportFilterSchema = z.object({
  managerId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
});
export type ReportFilterInput = z.infer<typeof reportFilterSchema>;