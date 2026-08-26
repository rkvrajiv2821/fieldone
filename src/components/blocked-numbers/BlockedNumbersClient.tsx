"use client";

import { useState } from "react";
import { Plus, Ban, Trash2, Phone } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { BlockNumberModal } from "./BlockNumberModal";

type BlockedNumber = {
  id: string;
  phone: string;
  reason?: string | null;
  createdAt: Date;
  blockedBy: { id: string; name: string };
};

type Customer = { id: string; name: string; phone: string; company?: string | null };

export function BlockedNumbersClient({ initialBlockedNumbers, customers }: {
  initialBlockedNumbers: BlockedNumber[];
  customers: Customer[];
}) {
  const [blockedNumbers, setBlockedNumbers] = useState(initialBlockedNumbers);
  const [showCreate, setShowCreate] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleUnblock = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/blocked-numbers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to unblock number");
      setBlockedNumbers((prev) => prev.filter((b) => b.id !== id));
      toast.success("Number unblocked");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="page-title">Blocked Numbers</h2>
          <p className="page-subtitle">{blockedNumbers.length} number{blockedNumbers.length === 1 ? "" : "s"} blocked from being added as new customers</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Block Number
        </button>
      </div>

      <div className="crm-card p-0 overflow-hidden">
        {blockedNumbers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Ban className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No numbers blocked</p>
            <p className="text-gray-400 text-sm mt-1">Blocked numbers can&apos;t be added as new customers</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>Reason</th>
                  <th className="hide-mobile">Blocked By</th>
                  <th className="hide-tablet">Blocked On</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {blockedNumbers.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span className="flex items-center gap-1.5 font-semibold text-gray-900">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />{b.phone}
                      </span>
                    </td>
                    <td className="text-gray-600 text-sm">{b.reason || "—"}</td>
                    <td className="hide-mobile text-gray-600 text-sm">{b.blockedBy.name}</td>
                    <td className="hide-tablet text-gray-500 text-xs">{formatDate(b.createdAt)}</td>
                    <td>
                      <button
                        onClick={() => handleUnblock(b.id)}
                        disabled={removingId === b.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Unblock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <BlockNumberModal
          customers={customers}
          blockedPhones={new Set(blockedNumbers.map((b) => b.phone))}
          onClose={() => setShowCreate(false)}
          onCreated={(blocked) => setBlockedNumbers((prev) => [blocked, ...prev])}
        />
      )}
    </div>
  );
}
