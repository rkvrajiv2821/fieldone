"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2, Clock, AlertCircle, Pencil, Trash2,
  Phone, Building2, CalendarClock, MessageSquare, ChevronDown,
} from "lucide-react";
import { FollowUpStatus } from "@prisma/client";
import { cn, formatRelativeDate, priorityConfig } from "@/lib/utils";

type FollowUp = {
  id: string;
  scheduledAt: Date;
  notes?: string | null;
  status: FollowUpStatus;
  priority: "HIGH" | "MEDIUM" | "LOW";
  contactMethod?: string | null;
  purpose?: string | null;
  completedAt?: Date | null;
  completionNote?: string | null;
  lead: { id: string; name: string; company?: string | null; phone: string };
  assignedTo: { id: string; name: string };
};

const statusIcons = {
  PENDING:   <Clock className="w-3.5 h-3.5" />,
  OVERDUE:   <AlertCircle className="w-3.5 h-3.5" />,
  COMPLETED: <CheckCircle2 className="w-3.5 h-3.5" />,
};

const statusStyles = {
  PENDING:   "text-amber-700 bg-amber-50 border-amber-200",
  OVERDUE:   "text-red-700 bg-red-50 border-red-200",
  COMPLETED: "text-emerald-700 bg-emerald-50 border-emerald-200",
};

export function FollowUpCard({ followUp, isSuperAdmin, onStatusChange, onEdit, onDelete }: {
  followUp: FollowUp;
  isSuperAdmin: boolean;
  onStatusChange: (id: string, status: FollowUpStatus, note?: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showComplete, setShowComplete] = useState(false);
  const [completionNote, setCompletionNote] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const priority = priorityConfig[followUp.priority];

  return (
    <>
      <div className={cn(
        "crm-card p-4 transition-all hover:shadow-md",
        followUp.status === FollowUpStatus.OVERDUE && "border-red-200 bg-red-50/30",
        followUp.status === FollowUpStatus.COMPLETED && "opacity-70",
      )}>
        <div className="flex items-start gap-4">
          {/* Priority dot */}
          <div className={cn("w-2.5 h-2.5 rounded-full mt-2 shrink-0", priority.dot)} />

          <div className="flex-1 min-w-0">
            {/* Lead name + company */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-gray-900">{followUp.lead.name}</p>
                {followUp.lead.company && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3" /> {followUp.lead.company}
                  </p>
                )}
              </div>
              {/* Status badge */}
              <span className={cn("status-badge shrink-0", statusStyles[followUp.status])}>
                {statusIcons[followUp.status]}
                {followUp.status.charAt(0) + followUp.status.slice(1).toLowerCase().replace("_", " ")}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <CalendarClock className="w-3.5 h-3.5" />
                {formatRelativeDate(followUp.scheduledAt)}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Phone className="w-3.5 h-3.5" />
                {followUp.lead.phone}
              </span>
              {followUp.contactMethod && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                  {followUp.contactMethod}
                </span>
              )}
              {followUp.purpose && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full font-medium">
                  {followUp.purpose}
                </span>
              )}
              <span className={cn("px-2 py-0.5 text-xs rounded-full font-medium border", priority.color)}>
                {priority.label} priority
              </span>
              {isSuperAdmin && (
                <span className="text-xs text-gray-400">→ {followUp.assignedTo.name}</span>
              )}
            </div>

            {/* Notes */}
            {followUp.notes && (
              <p className="mt-2 text-sm text-gray-500 flex items-start gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {followUp.notes}
              </p>
            )}

            {/* Completion note */}
            {followUp.completionNote && (
              <p className="mt-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                ✓ {followUp.completionNote}
              </p>
            )}
          </div>

          {/* Actions */}
          {followUp.status !== FollowUpStatus.COMPLETED && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setShowComplete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Done
              </button>
              <button onClick={onEdit}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Complete modal */}
      {showComplete && createPortal(
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
          <div onClick={() => setShowComplete(false)} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)" }} />
          <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "24rem", padding: "1.5rem" }}>
            <h3 className="font-bold text-gray-900 mb-1">Mark as Completed</h3>
            <p className="text-sm text-gray-500 mb-4">Follow-up with <strong>{followUp.lead.name}</strong></p>
            <textarea
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Add a completion note (optional)..."
              rows={3}
              className="form-input resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowComplete(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  onStatusChange(followUp.id, FollowUpStatus.COMPLETED, completionNote);
                  setShowComplete(false);
                }}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                Mark Complete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && createPortal(
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", boxSizing: "border-box" }}>
          <div onClick={() => setShowDeleteConfirm(false)} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)" }} />
          <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: "1rem", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", width: "100%", maxWidth: "22rem", padding: "1.5rem" }}>
            <h3 className="font-bold text-gray-900 mb-2">Delete Follow-up?</h3>
            <p className="text-sm text-gray-500 mb-4">This will permanently delete the follow-up with <strong>{followUp.lead.name}</strong>.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                Cancel
              </button>
              <button onClick={() => { onDelete(); setShowDeleteConfirm(false); }}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg">
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}