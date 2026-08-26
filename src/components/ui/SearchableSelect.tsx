"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };

// Dropdown with type-to-search and an inline "+ Add" row for creating new options
export function SearchableSelect({
  options,
  value,
  onChange,
  onCreateOption,
  placeholder = "Select...",
  disabled = false,
}: {
  options: Option[];
  value: string;
  onChange: (name: string) => void;
  onCreateOption?: (name: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));
  const exactMatch = options.some((o) => o.name.toLowerCase() === query.trim().toLowerCase());
  const canOfferCreate = !!(onCreateOption && query.trim() && !exactMatch);

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
    setQuery("");
  };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name || !onCreateOption) return;
    setCreating(true);
    try {
      await onCreateOption(name);
      handleSelect(name);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "form-input bg-white text-left flex items-center justify-between disabled:opacity-60",
          !value && "text-gray-400"
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="relative border-b border-gray-100">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or add new..."
              className="w-full pl-9 pr-3 py-2 text-sm focus:outline-none"
            />
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 && !canOfferCreate && (
              <p className="px-3 py-2 text-sm text-gray-400">No options found</p>
            )}
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => handleSelect(o.name)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50",
                  value === o.name && "bg-blue-50 text-blue-700 font-medium"
                )}
              >
                {o.name}
                {value === o.name && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>

          {canOfferCreate && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 border-t border-gray-100 disabled:opacity-60"
            >
              <Plus className="w-3.5 h-3.5" />
              {creating ? "Adding..." : `Add "${query.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
