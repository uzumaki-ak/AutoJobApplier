// [F72] src/types/profile.ts — Resume profile types

export interface Project {
  name: string;
  impact: string;
}

export interface ExperienceEntry {
  role: string;
  company: string;
  dates?: string;
  highlights?: string;
}

export interface EducationEntry {
  degree: string;
  school: string;
  dates?: string;
  details?: string;
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  title: string;
  skills: string[];
  projects: Project[];
  summary?: string;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  certifications?: string[];
  achievements?: string[];
  resumeText?: string;
  resumeUrl?: string;
  experienceLevel: string;
  preferredRoles: string[];
  tonePreference: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateProfileInput = Omit<Profile, "id" | "userId" | "createdAt" | "updatedAt">;
export type UpdateProfileInput = Partial<CreateProfileInput>;

export type TonePreference = "confident" | "formal" | "friendly" | "direct" | "startup";
