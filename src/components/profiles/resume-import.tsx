// [F79] src/components/profiles/resume-import.tsx — Import resume to create profile

"use client";

import { useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

type ImportMode = "text" | "file";

export function ResumeImport() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ImportMode>("text");
  const [resumeText, setResumeText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleImport() {
    if (mode === "text" && !resumeText.trim()) {
      toast({ title: "Paste your resume text first", variant: "destructive" });
      return;
    }
    if (mode === "file" && !file) {
      toast({ title: "Select a resume file first", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      if (mode === "text") {
        form.append("resumeText", resumeText);
      } else if (file) {
        form.append("file", file);
      }
      form.append("isDefault", String(isDefault));

      const res = await fetch("/api/profiles/import", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({ title: "Resume imported into a new profile" });
      setOpen(false);
      setResumeText("");
      setFile(null);
      router.refresh();
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : "Import failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-muted)]"
      >
        <Upload size={16} />
        Import Resume
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-lg glass rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] shrink-0">
              <h2 className="font-display text-sm font-bold text-[var(--color-foreground)]">
                IMPORT RESUME
              </h2>
              <button onClick={() => setOpen(false)}><X size={18} className="text-[var(--color-muted-foreground)]" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex gap-2 p-1 bg-[var(--color-muted)] rounded-xl w-fit">
                {(["text", "file"] as ImportMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                      mode === m
                        ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                        : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                    }`}
                  >
                    {m === "text" ? "Paste Text" : "Upload PDF"}
                  </button>
                ))}
              </div>

              {mode === "text" ? (
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  rows={8}
                  placeholder="Paste your resume text here..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                />
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--color-border)] rounded-xl p-6 text-center gap-3 cursor-pointer hover:border-[var(--color-primary)]/60">
                  <FileText size={28} className="text-[var(--color-muted-foreground)]" />
                  <div className="text-sm text-[var(--color-foreground)]">
                    {file ? file.name : "Click to upload a PDF resume"}
                  </div>
                  <input
                    type="file"
                    accept="application/pdf,text/plain"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-[var(--color-foreground)]">Set as default profile</span>
              </label>
            </div>

            <div className="p-5 border-t border-[var(--color-border)] shrink-0">
              <button
                onClick={handleImport}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-semibold text-sm hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Importing..." : "Import Resume"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
