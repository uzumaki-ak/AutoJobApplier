// [F49] src/components/generate/generate-form.tsx — Main generation form
// Tabs: Text Paste | Image Upload | URL
// On generate: shows email preview modal

"use client";

import { useState } from "react";
import { ImageUpload } from "./image-upload";
import { ProfileSelector } from "./profile-selector";
import { EmailPreview } from "./email-preview";
import { useToast } from "@/hooks/use-toast";
import type { Profile } from "@/types/profile";

interface GenerateFormProps {
  profiles: Profile[];
}

type InputMode = "text" | "image" | "url";

interface ExtractedData {
  company: string;
  role: string;
  hrEmail?: string;
  recruiterName?: string;
  jobDescription: string;
}

interface GeneratedEmail {
  subject: string;
  body: string;
  usedProfileId: string;
  usedProfileName: string;
  autoSelectedReason: string;
}

async function readJsonResponse(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }

  const text = await res.text();
  if (text.includes("<!DOCTYPE") || text.includes("<html")) {
    throw new Error("The extraction endpoint is unavailable right now. Refresh and try again.");
  }

  throw new Error(text || "Unexpected server response");
}

export function GenerateForm({ profiles }: GenerateFormProps) {
  const [mode, setMode] = useState<InputMode>("text");
  const [profileId, setProfileId] = useState(profiles.find((p) => p.isDefault)?.id ?? profiles[0]?.id ?? "auto");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [multiAgent, setMultiAgent] = useState(true);

  // Text mode state
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [recruiterName, setRecruiterName] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  // URL mode
  const [url, setUrl] = useState("");

  // Generated email
  const [generated, setGenerated] = useState<GeneratedEmail | null>(null);

  const { toast } = useToast();

  /** Extract data from image via Gemini */
  async function handleImageExtract(base64: string, mimeType: string) {
    setExtracting(true);
    try {
      const res = await fetch("/api/extract/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await readJsonResponse(res);
      if (!data.success) throw new Error(data.error);

      const extracted: ExtractedData = data.data;
      setCompany(extracted.company ?? "");
      setRole(extracted.role ?? "");
      setHrEmail(extracted.hrEmail ?? "");
      setRecruiterName(extracted.recruiterName ?? "");
      setJobDescription(extracted.jobDescription ?? "");
      setMode("text"); // Switch to text to show filled fields
      toast({ title: "Job details extracted successfully" });
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : "Extraction failed", variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  }

  /** Extract from URL */
  async function handleUrlExtract() {
    if (!url) return;
    setExtracting(true);
    try {
      const res = await fetch("/api/extract/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await readJsonResponse(res);
      if (!data.success) throw new Error(data.error);

      const extracted: ExtractedData = data.data;
      setCompany(extracted.company ?? "");
      setRole(extracted.role ?? "");
      setHrEmail(extracted.hrEmail ?? "");
      setRecruiterName(extracted.recruiterName ?? "");
      setJobDescription(extracted.jobDescription ?? "");
      setMode("text");
      toast({ title: "Details extracted from URL" });
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : "URL extraction failed", variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  }

  /** Generate email */
  async function handleGenerate() {
    if (!role || !jobDescription) {
      toast({ title: "Role and job description are required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, company, role, jobDescription, recruiterName, multiAgent }),
      });
      const data = await readJsonResponse(res);
      if (!data.success) throw new Error(data.error);
      setGenerated(data.data);
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : "Generation failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex gap-2 p-1 bg-[var(--color-muted)] rounded-xl w-fit">
        {(["text", "image", "url"] as InputMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              mode === m
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            {m === "text" ? "Paste Text" : m === "image" ? "📸 Screenshot" : "🔗 URL"}
          </button>
        ))}
      </div>

      {/* Image upload mode */}
      {mode === "image" && (
        <ImageUpload onExtract={handleImageExtract} loading={extracting} />
      )}

      {/* URL mode */}
      {mode === "url" && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Paste a LinkedIn job URL — AI will extract the details. Works ~60% of the time.
          </p>
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://linkedin.com/jobs/view/..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            />
            <button
              onClick={handleUrlExtract}
              disabled={extracting || !url}
              className="px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {extracting ? "Extracting..." : "Extract"}
            </button>
          </div>
        </div>
      )}

      {/* Text/form input (always visible, populated by image/url extraction) */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Google, Flipkart... (optional if OCR misses it)"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Role *</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Backend Developer..."
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">HR Email</label>
            <input
              type="email"
              value={hrEmail}
              onChange={(e) => setHrEmail(e.target.value)}
              placeholder="hr@company.com"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Recruiter Name</label>
            <input
              type="text"
              value={recruiterName}
              onChange={(e) => setRecruiterName(e.target.value)}
              placeholder="Priya, Rahul..."
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Job Description *</label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={6}
            placeholder="Paste the full job description here..."
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          />
        </div>
      </div>

      {/* Profile selector + generate button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <ProfileSelector
          profiles={profiles}
          value={profileId}
          onChange={setProfileId}
        />
        <label className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
          <input
            type="checkbox"
            checked={multiAgent}
            onChange={(e) => setMultiAgent(e.target.checked)}
            className="rounded"
          />
          Multi-agent mode (higher quality, slower)
        </label>
        <button
          onClick={handleGenerate}
          disabled={loading || !role || !jobDescription}
          className="sm:ml-auto px-6 py-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            "✨ Generate Email"
          )}
        </button>
      </div>

      {/* Email preview modal */}
      {generated && (
        <EmailPreview
          email={generated}
          company={company}
          role={role}
          hrEmail={hrEmail}
          jobDescription={jobDescription}
          onClose={() => setGenerated(null)}
        />
      )}
    </div>
  );
}
