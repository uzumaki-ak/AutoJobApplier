// [F54] src/components/profiles/profile-form.tsx — Create/edit profile form

"use client";

import { useState } from "react";
import { Plus, Edit2, X } from "lucide-react";
import type { EducationEntry, ExperienceEntry, Profile, TonePreference } from "@/types/profile";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface ProfileFormProps {
  mode: "create" | "edit";
  profile?: Profile;
}

const TONE_OPTIONS: TonePreference[] = ["confident", "formal", "friendly", "direct", "startup"];

export function ProfileForm({ mode, profile }: ProfileFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: profile?.name ?? "",
    title: profile?.title ?? "",
    skills: profile?.skills.join(", ") ?? "",
    projects: profile?.projects.map((p) => `${p.name}: ${p.impact}`).join("\n") ?? "",
    summary: profile?.summary ?? "",
    contactEmail: profile?.contactEmail ?? "",
    contactPhone: profile?.contactPhone ?? "",
    location: profile?.location ?? "",
    portfolioUrl: profile?.portfolioUrl ?? "",
    githubUrl: profile?.githubUrl ?? "",
    linkedinUrl: profile?.linkedinUrl ?? "",
    experience: Array.isArray(profile?.experience)
      ? profile.experience
          .map((e) => [e.role, e.company, e.dates ?? "", e.highlights ?? ""].join(" | "))
          .join("\n")
      : "",
    education: Array.isArray(profile?.education)
      ? profile.education
          .map((e) => [e.degree, e.school, e.dates ?? "", e.details ?? ""].join(" | "))
          .join("\n")
      : "",
    certifications: Array.isArray(profile?.certifications) ? profile!.certifications.join(", ") : "",
    achievements: Array.isArray(profile?.achievements) ? profile!.achievements.join("\n") : "",
    resumeUrl: profile?.resumeUrl ?? "",
    experienceLevel: profile?.experienceLevel ?? "",
    preferredRoles: profile?.preferredRoles.join(", ") ?? "",
    tonePreference: (profile?.tonePreference ?? "confident") as TonePreference,
    isDefault: profile?.isDefault ?? false,
  });

  function parseExperience(input: string): ExperienceEntry[] {
    return input
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [role, company, dates, ...rest] = line.split("|").map((part) => part.trim());
        return {
          role: role ?? "",
          company: company ?? "",
          dates: dates ?? "",
          highlights: rest.join(" | ").trim(),
        };
      })
      .filter((entry) => entry.role || entry.company);
  }

  function parseEducation(input: string): EducationEntry[] {
    return input
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [degree, school, dates, ...rest] = line.split("|").map((part) => part.trim());
        return {
          degree: degree ?? "",
          school: school ?? "",
          dates: dates ?? "",
          details: rest.join(" | ").trim(),
        };
      })
      .filter((entry) => entry.degree || entry.school);
  }

  async function handleSubmit() {
    if (!form.name || !form.title || !form.skills) {
      toast({ title: "Name, title and skills are required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        title: form.title,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        projects: form.projects
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const [name, ...rest] = line.split(":");
            return { name: name.trim(), impact: rest.join(":").trim() };
          }),
        summary: form.summary.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        location: form.location.trim(),
        portfolioUrl: form.portfolioUrl.trim(),
        githubUrl: form.githubUrl.trim(),
        linkedinUrl: form.linkedinUrl.trim(),
        experience: parseExperience(form.experience),
        education: parseEducation(form.education),
        certifications: form.certifications.split(",").map((c) => c.trim()).filter(Boolean),
        achievements: form.achievements.split("\n").map((a) => a.trim()).filter(Boolean),
        resumeUrl: form.resumeUrl.trim(),
        experienceLevel: form.experienceLevel,
        preferredRoles: form.preferredRoles.split(",").map((r) => r.trim()).filter(Boolean),
        tonePreference: form.tonePreference,
        isDefault: form.isDefault,
      };

      const url = mode === "edit" ? `/api/profiles/${profile!.id}` : "/api/profiles";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({ title: mode === "edit" ? "Profile updated" : "Profile created" });
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
          mode === "create"
            ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90"
            : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] p-1.5"
        }`}
      >
        {mode === "create" ? <><Plus size={16} /> New Profile</> : <Edit2 size={14} />}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-lg glass rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] shrink-0">
              <h2 className="font-display text-sm font-bold text-[var(--color-foreground)]">
                {mode === "create" ? "NEW PROFILE" : "EDIT PROFILE"}
              </h2>
              <button onClick={() => setOpen(false)}><X size={18} className="text-[var(--color-muted-foreground)]" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {[
                { label: "Profile Name *", key: "name", placeholder: "Full Stack Dev, Blockchain Dev..." },
                { label: "Title *", key: "title", placeholder: "Full Stack Developer" },
                { label: "Skills * (comma separated)", key: "skills", placeholder: "Next.js, Node.js, TypeScript..." },
                { label: "Experience Level", key: "experienceLevel", placeholder: "Fresher with strong project portfolio" },
                { label: "Preferred Roles (comma separated)", key: "preferredRoles", placeholder: "Backend, Full Stack, AI" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">{label}</label>
                  <input
                    type="text"
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  />
                </div>
              ))}

              <div>
                <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Summary</label>
                <textarea
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  rows={3}
                  placeholder="Short professional summary..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Contact Email", key: "contactEmail", placeholder: "name@email.com" },
                  { label: "Contact Phone", key: "contactPhone", placeholder: "+91-xxxxxx" },
                  { label: "Location", key: "location", placeholder: "New Delhi, India" },
                  { label: "Portfolio URL", key: "portfolioUrl", placeholder: "https://your-portfolio.com" },
                  { label: "GitHub URL", key: "githubUrl", placeholder: "https://github.com/username" },
                  { label: "LinkedIn URL", key: "linkedinUrl", placeholder: "https://linkedin.com/in/username" },
                  { label: "Resume URL", key: "resumeUrl", placeholder: "https://..." },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">{label}</label>
                    <input
                      type="text"
                      value={form[key as keyof typeof form] as string}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">
                  Projects (one per line: Name: Impact)
                </label>
                <textarea
                  value={form.projects}
                  onChange={(e) => setForm((f) => ({ ...f, projects: e.target.value }))}
                  rows={4}
                  placeholder={"AI Finance Tracker: Automated email alerts\nMultiplayer Game: Built with Socket.io"}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">
                  Experience (one per line: Role | Company | Dates | Highlights)
                </label>
                <textarea
                  value={form.experience}
                  onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
                  rows={4}
                  placeholder={"Full Stack Dev | CodeWithDhruv | Sep 2025 - Oct 2025 | Built auth + dashboard"}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">
                  Education (one per line: Degree | School | Dates | Details)
                </label>
                <textarea
                  value={form.education}
                  onChange={(e) => setForm((f) => ({ ...f, education: e.target.value }))}
                  rows={3}
                  placeholder={"B.Tech CSE | Maharshi Dayanand University | 2023 - 2027 | CGPA 8.2"}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">
                    Certifications (comma separated)
                  </label>
                  <input
                    type="text"
                    value={form.certifications}
                    onChange={(e) => setForm((f) => ({ ...f, certifications: e.target.value }))}
                    placeholder="Google UX, AWS CCP..."
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">
                    Achievements (one per line)
                  </label>
                  <textarea
                    value={form.achievements}
                    onChange={(e) => setForm((f) => ({ ...f, achievements: e.target.value }))}
                    rows={2}
                    placeholder={"NSUT Delhi Hackathon 2025 - 2nd place"}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-input)] border border-[var(--color-border)] text-[var(--color-foreground)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--color-muted-foreground)] mb-1 block">Tone</label>
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, tonePreference: t }))}
                      className={`px-3 py-1.5 rounded-xl text-xs capitalize transition-all ${
                        form.tonePreference === t
                          ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                          : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-[var(--color-foreground)]">Set as default profile</span>
              </label>
            </div>

            <div className="p-5 border-t border-[var(--color-border)] shrink-0">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-semibold text-sm hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Saving..." : mode === "create" ? "Create Profile" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
