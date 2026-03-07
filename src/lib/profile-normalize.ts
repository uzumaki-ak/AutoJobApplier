import type { EducationEntry, ExperienceEntry, Profile, Project } from "@/types/profile";

function isProject(value: unknown): value is Project {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { name?: unknown }).name === "string" &&
    typeof (value as { impact?: unknown }).impact === "string"
  );
}

function isExperienceEntry(value: unknown): value is ExperienceEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { role?: unknown }).role === "string" &&
    typeof (value as { company?: unknown }).company === "string"
  );
}

function isEducationEntry(value: unknown): value is EducationEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { degree?: unknown }).degree === "string" &&
    typeof (value as { school?: unknown }).school === "string"
  );
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function normalizeProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isProject);
}

function normalizeExperience(value: unknown): ExperienceEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isExperienceEntry).map((entry) => ({
    role: entry.role,
    company: entry.company,
    dates: entry.dates,
    highlights: entry.highlights,
  }));
}

function normalizeEducation(value: unknown): EducationEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isEducationEntry).map((entry) => ({
    degree: entry.degree,
    school: entry.school,
    dates: entry.dates,
    details: entry.details,
  }));
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeProfile(record: Record<string, unknown>): Profile {
  return {
    id: String(record.id ?? ""),
    userId: String(record.userId ?? ""),
    name: String(record.name ?? ""),
    title: String(record.title ?? ""),
    skills: normalizeStringArray(record.skills),
    projects: normalizeProjects(record.projects),
    summary: normalizeOptionalString(record.summary),
    contactEmail: normalizeOptionalString(record.contactEmail),
    contactPhone: normalizeOptionalString(record.contactPhone),
    location: normalizeOptionalString(record.location),
    portfolioUrl: normalizeOptionalString(record.portfolioUrl),
    githubUrl: normalizeOptionalString(record.githubUrl),
    linkedinUrl: normalizeOptionalString(record.linkedinUrl),
    experience: normalizeExperience(record.experience),
    education: normalizeEducation(record.education),
    certifications: normalizeStringArray(record.certifications),
    achievements: normalizeStringArray(record.achievements),
    resumeText: normalizeOptionalString(record.resumeText),
    resumeUrl: normalizeOptionalString(record.resumeUrl),
    experienceLevel: String(record.experienceLevel ?? ""),
    preferredRoles: normalizeStringArray(record.preferredRoles),
    tonePreference: String(record.tonePreference ?? "confident"),
    isDefault: Boolean(record.isDefault),
    createdAt:
      record.createdAt instanceof Date
        ? record.createdAt.toISOString()
        : String(record.createdAt ?? ""),
    updatedAt:
      record.updatedAt instanceof Date
        ? record.updatedAt.toISOString()
        : String(record.updatedAt ?? ""),
  };
}
