// [F52] src/components/generate/email-preview.tsx — Email preview + send modal
// Shows generated email, allows edit, then: save, draft, template, or direct send

"use client";

import { useState } from "react";
import { Copy, ExternalLink, Save, Send, X } from "lucide-react";
import { buildGmailComposeUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
}

export function EmailPreview({ email, company, role, hrEmail, jobDescription, onClose }: EmailPreviewProps) {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const { toast } = useToast();

  const gmailUrl = hrEmail
    ? buildGmailComposeUrl({ to: hrEmail, subject, body })
    : null;

  async function saveApplication(): Promise<string> {
    setSaving(true);
    try {
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
        setApplicationId(data.data.id);
        return data.data.id as string;
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
      toast({ title: "Application saved to tracker!" });
      onClose();
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
      const appId = applicationId ?? (await saveApplication());
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: appId,
          to: hrEmail,
          subject,
          body,
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
      const appId = applicationId ?? (await saveApplication());
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
