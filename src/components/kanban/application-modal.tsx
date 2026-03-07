// [F48] src/components/kanban/application-modal.tsx — Application edit/view modal

"use client";

import { useState } from "react";
import { Edit2, Trash2 } from "lucide-react";
import type { Application, ApplicationStatus } from "@/types/application";
import { STATUS_LABELS } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Props {
  application: Application;
  onSave: (updated: Application) => void;
  onDelete: (id: string) => void;
}

export function ApplicationModal({ application: app, onSave, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(app.notes ?? "");
  const [hrEmail, setHrEmail] = useState(app.hrEmail ?? "");
  const [status, setStatus] = useState<ApplicationStatus>(app.status);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, hrEmail, status }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onSave(data.data);
      setOpen(false);
      toast({ title: "Application updated" });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this application?")) return;
    try {
      await fetch(`/api/applications/${app.id}`, { method: "DELETE" });
      onDelete(app.id);
      setOpen(false);
      toast({ title: "Application deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] flex items-center gap-1"
      >
        <Edit2 size={12} /> Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-md glass rounded-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-[var(--color-foreground)]">EDIT APPLICATION</h2>
              <button onClick={() => setOpen(false)} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">✕</button>
            </div>

            <div>
              <p className="font-medium text-[var(--color-foreground)]">{app.company}</p>
              <p className="text-sm text-[var(--color-muted-foreground)]">{app.role}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">HR Email</label>
                <input
                  type="email"
                  value={hrEmail}
                  onChange={(e) => setHrEmail(e.target.value)}
                  placeholder="hr@company.com"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any notes..."
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleDelete}
                className="p-2.5 rounded-xl text-[var(--color-destructive)] bg-red-500/10 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
