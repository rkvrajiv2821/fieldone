"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, Loader2, Phone, Mail, Building2, MapPin, CalendarPlus,
  Clock, CheckCircle2, AlertCircle, MessageSquare, Ban,
} from "lucide-react";
import { cn, formatDateTime, statusConfig, priorityConfig } from "@/lib/utils";

type FollowUpEntry = {
  id: string;
  scheduledAt: string;
  notes?: string | null;
  status: "PENDING" | "COMPLETED" | "OVERDUE";
  priority: "HIGH" | "MEDIUM" | "LOW";
  contactMethod?: string | null;
  purpose?: string | null;
  completedAt?: string | null;
  completionNote?: string | null;
  createdAt: string;
};

type LeadDetail = {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  company?: string | null;
  address?: string | null;
  status: "LEAD" | "FOLLOW_UP" | "CLIENT";
  isBlocked?: boolean;
  createdAt: string;
  assignedTo: { id: string; name: string };
  followUps: FollowUpEntry[];
};

const followUpStatusIcon = {
  PENDING:   <Clock className="w-3.5 h-3.5" />,
  OVERDUE:   <AlertCircle className="w-3.5 h-3.5" />,
  COMPLETED: <CheckCircle2 className="w-3.5 h-3.5" />,
};

export function CustomerHistoryModal({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lead, setLead]       = useState<LeadDetail | null>(null);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/leads/${leadId}`);
        const data = await res.json();
        if (data.success) setLead(data.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [leadId]);

  if (!mounted) return null;

  // Build a chronological timeline: created → each follow-up → became a customer
  const timeline: Array<{ key: string; date: string; node: React.ReactNode }> = [];
  if (lead) {
    timeline.push({
      key: "created",
      date: lead.createdAt,
      node: (
        <div>
          <p className="text-sm font-semibold text-gray-900">Customer created</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(lead.createdAt)}</p>
        </div>
      ),
    });

    lead.followUps.forEach((fu) => {
      const fuStatus = statusConfig[fu.status];
      const fuPriority = priorityConfig[fu.priority];
      timeline.push({
        key: fu.id,
        date: fu.createdAt,
        node: (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("status-badge", fuStatus.color)}>
                {followUpStatusIcon[fu.status]}
                {fuStatus.label}
              </span>
              {fu.purpose && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full font-medium">
                  {fu.purpose}
                </span>
              )}
              <span className={cn("px-2 py-0.5 text-xs rounded-full font-medium border", fuPriority.color)}>
                {fuPriority.label} priority
              </span>
              {fu.contactMethod && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                  {fu.contactMethod}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              Scheduled for {formatDateTime(fu.scheduledAt)}
            </p>
            {fu.notes && (
              <p className="mt-1.5 text-sm text-gray-600 flex items-start gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
                {fu.notes}
              </p>
            )}
            {fu.status === "COMPLETED" && (
              <p className="mt-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg inline-block">
                ✓ Completed {formatDateTime(fu.completedAt)}
                {fu.completionNote ? ` — ${fu.completionNote}` : ""}
              </p>
            )}
          </div>
        ),
      });
    });

    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  return createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)" }} />

      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "36rem", maxHeight: "calc(100vh - 2rem)", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <div className="min-w-0">
            <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "#111827" }}>
              {loading ? "Loading..." : lead?.name || "Customer History"}
            </h2>
            {lead && (
              <div className="flex items-center gap-3 flex-wrap mt-1.5">
                <span className={cn("status-badge", statusConfig[lead.status].color)}>{statusConfig[lead.status].label}</span>
                {lead.isBlocked && (
                  <span className="status-badge text-red-700 bg-red-50 border-red-200">
                    <Ban className="w-3 h-3" /> Blocked
                  </span>
                )}
                {lead.company && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Building2 className="w-3.5 h-3.5" />{lead.company}
                  </span>
                )}
                <a href={`tel:${lead.phone}`}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline">
                  <Phone className="w-3.5 h-3.5" />{lead.phone}
                </a>
                {lead.email && (
                  <a href={`mailto:${lead.email}`}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline">
                    <Mail className="w-3.5 h-3.5" />{lead.email}
                  </a>
                )}
                {lead.address && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5" />{lead.address}
                  </span>
                )}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline */}
        <div style={{ overflowY: "auto", flex: 1 }} className="px-6 py-5">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-6 h-6 text-gray-300 animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Loading history...</p>
            </div>
          ) : !lead ? (
            <div className="py-16 text-center text-gray-400 text-sm">Could not load customer history</div>
          ) : (
            <div className="space-y-0">
              {timeline.map((item, i) => (
                <div key={item.key} className="flex gap-3">
                  {/* Dot + connecting line */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5" />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                  </div>
                  <div className="pb-5 flex-1 min-w-0">{item.node}</div>
                </div>
              ))}
              {lead.followUps.length === 0 && (
                <div className="ml-5 pt-2">
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <CalendarPlus className="w-3.5 h-3.5" /> No follow-ups scheduled yet
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
