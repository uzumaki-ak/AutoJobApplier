// [F52] src/components/generate/email-preview.tsx — Email preview + send modal
// Shows generated email, allows edit, then: save, draft, template, or direct send

"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Save, Send, X } from "lucide-react";
import { buildGmailComposeUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type AttachmentSummary = {
  id: string;
  fileName: string;
  sizeBytes: number;
  isActive: boolean;
  linkedProfileId?: string | null;
};

interface EmailPreviewProps {
  email: {
    subject: string;
    body: string;
    usedProfileId: string;
    usedProfileName: string;
    autoSelectedReason: string;
  };
  company: string;
  role: string;
  hrEmail: string;
  jobDescription: string;
  onClose: () => void;
  existingApplicationId?: string | null;
}

export function EmailPreview({
  email,
  company,
  role,
  hrEmail,
  jobDescription,
  onClose,
  existingApplicationId = null,
}: EmailPreviewProps) {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentSummary[]>([]);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  const { toast } = useToast();

  const gmailUrl = hrEmail
    ? buildGmailComposeUrl({ to: hrEmail, subject, body })
    : null;

  useEffect(() => {
    let cancelled = false;

    async function loadAttachments() {
      try {
        const res = await fetch("/api/attachments", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.success || cancelled) return;
        const available = Array.isArray(data.data)
          ? data.data.filter(
              (attachment: AttachmentSummary) =>
                attachment &&
                typeof attachment.id === "string" &&
                typeof attachment.fileName === "string" &&
                attachment.isActive !== false
            )
          : [];
        const matchedAttachment = email.usedProfileId
          ? available.find((attachment: AttachmentSummary) => attachment.linkedProfileId === email.usedProfileId)
          : null;
        const defaultAttachmentId =
          matchedAttachment?.id ?? (available.length === 1 ? available[0]?.id ?? null : null);

        setAttachments(available);
        setSelectedAttachmentId(defaultAttachmentId);
      } catch {
        if (!cancelled) {
          setAttachments([]);
          setSelectedAttachmentId(null);
        }
      }
    }

    void loadAttachments();

    return () => {
      cancelled = true;
    };
  }, [email.usedProfileId]);

  async function saveApplication(): Promise<string> {
    setSaving(true);
    try {
      const targetId = applicationId ?? existingApplicationId;

      if (targetId) {
        const res = await fetch(`/api/applications/${targetId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hrEmail,
            jobDescription,
            mailSubject: subject,
            mailBody: body,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setApplicationId(targetId);
        return targetId;
      }

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          role,
          hrEmail,
          jobDescription,
          mailSubject: subject,
          mailBody: body,
          profileId: email.usedProfileId,
          followupAt: new Date(Date.now() + 5 * 86400000).toISOString(), // 5 days
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data?.data?.id) {
        const existingId = data.data.id as string;
        setApplicationId(existingId);

        const updateRes = await fetch(`/api/applications/${existingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hrEmail,
            jobDescription,
            mailSubject: subject,
            mailBody: body,
          }),
        });
        const updateData = await updateRes.json();
        if (!updateData.success) throw new Error(updateData.error);
        return existingId;
      }

      if (!data.success) throw new Error(data.error);
      setApplicationId(data.data.id);
      return data.data.id as string;
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : "Save failed", variant: "destructive" });
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    try {
      await saveApplication();
      toast({ title: "Saved to tracker. You can send now or close this draft." });
    } catch {
      // handled in saveApplication
    }
  }

  async function handleSendNow() {
    if (!hrEmail) {
      toast({ title: "HR email is required to send", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const appId = await saveApplication();
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: appId,
          to: hrEmail,
          subject,
          body,
          attachmentId: selectedAttachmentId,
          emailType: "OUTREACH",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast({ title: "Email sent via Gmail!" });
      onClose();
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : "Send failed", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  async function handleSaveDraft() {
    setSavingDraft(true);
    try {
      const appId = await saveApplication();
      const res = await fetch("/api/emails/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: appId,
          subject,
          body,
          emailType: "OUTREACH",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast({ title: "Draft saved!" });
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : "Draft save failed", variant: "destructive" });
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleSaveTemplate() {
    setSavingTemplate(true);
    try {
      const defaultName = `${company} - ${role}`.trim();
      const name = window.prompt("Template name", defaultName) ?? "";
      if (!name.trim()) {
        setSavingTemplate(false);
        return;
      }
      const res = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          subject,
          body,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast({ title: "Template saved!" });
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : "Template save failed", variant: "destructive" });
    } finally {
      setSavingTemplate(false);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    toast({ title: "Copied to clipboard" });
  }

  function formatAttachmentSize(sizeBytes: number) {
    if (!sizeBytes || sizeBytes <= 0) return "0 KB";
    const kb = sizeBytes / 1024;
    return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl glass rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] shrink-0">
          <div>
            <h2 className="font-display text-sm font-bold text-[var(--color-foreground)]">EMAIL PREVIEW</h2>
            {email.autoSelectedReason && (
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                Auto-selected: {email.usedProfileName} - {email.autoSelectedReason}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] p-1">
            <X size={18} />
          </button>
        </div>

        {/* Editable email */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-3 py-3">
            <p className="text-xs font-medium text-[var(--color-foreground)]">Resume PDF for this email</p>
            <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">
              {attachments.length > 0
                ? "Only the selected PDF below will be attached on Send Now. Open in Gmail cannot pre-attach files."
                : "No resume PDF is available yet. Upload one from Settings to attach it on Send Now."}
            </p>
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedAttachmentId(null)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                    selectedAttachmentId === null
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                      : "border-[var(--color-border)] bg-black/10 hover:bg-[var(--color-muted)]/60"
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--color-foreground)]">No resume attached</p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">Send only the email body</p>
                </button>
                {attachments.map((attachment) => {
                  const isSelected = selectedAttachmentId === attachment.id;
                  const matchesProfile =
                    Boolean(email.usedProfileId) && attachment.linkedProfileId === email.usedProfileId;

                  return (
                    <button
                      key={attachment.id}
                      type="button"
                      onClick={() => setSelectedAttachmentId(attachment.id)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                          : "border-[var(--color-border)] bg-black/10 hover:bg-[var(--color-muted)]/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--color-foreground)]">{attachment.fileName}</p>
                          <p className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
                            {formatAttachmentSize(attachment.sizeBytes)}
                            {matchesProfile ? " - matches selected profile" : ""}
                          </p>
                        </div>
                        {matchesProfile && (
                          <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                            Best match
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] font-mono"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-[var(--color-border)] flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? "Saving..." : "Save to Tracker"}
          </button>

          <button
            onClick={handleSendNow}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] text-sm font-semibold hover:bg-[var(--color-muted)] border border-[var(--color-border)] disabled:opacity-50"
          >
            <Send size={15} />
            {sending ? "Sending..." : "Send Now"}
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] text-sm border border-[var(--color-border)] hover:bg-[var(--color-muted)] disabled:opacity-50"
          >
            {savingDraft ? "Saving Draft..." : "Save Draft"}
          </button>

          <button
            onClick={handleSaveTemplate}
            disabled={savingTemplate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] text-sm border border-[var(--color-border)] hover:bg-[var(--color-muted)] disabled:opacity-50"
          >
            {savingTemplate ? "Saving Template..." : "Save Template"}
          </button>

          {gmailUrl && (
            <a
              href={gmailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] text-sm font-medium hover:bg-[var(--color-muted)] border border-[var(--color-border)]"
            >
              <ExternalLink size={15} />
              Open in Gmail
            </a>
          )}

          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] text-sm border border-[var(--color-border)] hover:bg-[var(--color-muted)]"
          >
            <Copy size={15} />
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
