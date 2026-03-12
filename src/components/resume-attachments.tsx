// [F88] src/components/resume-attachments.tsx — Upload/manage resume PDFs for Send Now

"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Attachment = {
  id: string;
  fileName: string;
  sizeBytes: number;
  isActive: boolean;
  linkedProfileId?: string | null;
};

type ProfileSummary = {
  id: string;
  name: string;
  title: string;
  isDefault?: boolean;
};

function formatSize(sizeBytes: number) {
  if (!sizeBytes || sizeBytes <= 0) return "0 KB";
  const kb = sizeBytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`;
}

export function ResumeAttachments() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [linkedProfileId, setLinkedProfileId] = useState<string>("none");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const profileMap = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles]
  );

  async function loadData() {
    try {
      const [attachmentsRes, profilesRes] = await Promise.all([
        fetch("/api/attachments", { cache: "no-store" }),
        fetch("/api/profiles", { cache: "no-store" }),
      ]);
      const attachmentsJson = await attachmentsRes.json();
      const profilesJson = await profilesRes.json();

      if (attachmentsRes.ok && attachmentsJson?.success) {
        setAttachments(Array.isArray(attachmentsJson.data) ? attachmentsJson.data : []);
      }

      if (profilesRes.ok && profilesJson?.success) {
        setProfiles(Array.isArray(profilesJson.data) ? profilesJson.data : []);
      }
    } catch {
      // Keep existing UI state if fetch fails
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleUpload() {
    if (!file) {
      toast({ title: "Choose a PDF first", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("isActive", "true");
      if (linkedProfileId && linkedProfileId !== "none") {
        form.append("linkedProfileId", linkedProfileId);
      }

      const res = await fetch("/api/attachments", { method: "POST", body: form });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error ?? "Upload failed");

      toast({ title: "Resume uploaded" });
      setFile(null);
      setLinkedProfileId("none");
      await loadData();
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : "Upload failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function updateAttachment(id: string, updates: Partial<Attachment>) {
    try {
      const res = await fetch(`/api/attachments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error ?? "Update failed");
      await loadData();
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : "Update failed", variant: "destructive" });
    }
  }

  async function deleteAttachment(id: string) {
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error ?? "Delete failed");
      await loadData();
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : "Delete failed", variant: "destructive" });
    }
  }

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="font-display text-sm font-semibold text-[var(--color-foreground)]">RESUME PDF ATTACHMENTS</h2>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
          Upload a PDF to attach when you click Send Now. You can keep multiple resumes and pick the right one per email.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="flex-1 flex items-center gap-3 border border-[var(--color-border)] rounded-xl px-3 py-2 cursor-pointer bg-[var(--color-muted)]/40">
          <UploadCloud size={18} className="text-[var(--color-muted-foreground)]" />
          <span className="text-sm text-[var(--color-foreground)]">
            {file ? file.name : "Choose PDF (max 6MB)"}
          </span>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>

        <select
          value={linkedProfileId}
          onChange={(e) => setLinkedProfileId(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-sm text-[var(--color-foreground)]"
        >
          <option value="none">No profile link</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} {profile.isDefault ? "(Default)" : ""}
            </option>
          ))}
        </select>

        <button
          onClick={handleUpload}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Upload PDF"}
        </button>
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">No resumes uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const linkedProfile = attachment.linkedProfileId
              ? profileMap.get(attachment.linkedProfileId)
              : null;
            return (
              <div
                key={attachment.id}
                className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--color-foreground)]">{attachment.fileName}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {formatSize(attachment.sizeBytes)}
                    {linkedProfile ? ` · Linked to ${linkedProfile.name}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-[var(--color-foreground)]">
                    <input
                      type="checkbox"
                      checked={attachment.isActive}
                      onChange={(e) => updateAttachment(attachment.id, { isActive: e.target.checked })}
                      className="rounded"
                    />
                    Active
                  </label>

                  <select
                    value={attachment.linkedProfileId ?? "none"}
                    onChange={(e) =>
                      updateAttachment(attachment.id, {
                        linkedProfileId: e.target.value === "none" ? null : e.target.value,
                      })
                    }
                    className="px-2 py-1 rounded-lg bg-[var(--color-input)] border border-[var(--color-border)] text-xs text-[var(--color-foreground)]"
                  >
                    <option value="none">No profile</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => deleteAttachment(attachment.id)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
