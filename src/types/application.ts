// [F71] src/types/application.ts — Application and Kanban types

export type ApplicationStatus =
  | "APPLIED"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "NO_RESPONSE";

export interface Application {
  id: string;
  userId: string;
  profileId?: string | null;
  company: string;
  role: string;
  hrEmail?: string | null;
  jobDescription?: string | null;
  status: ApplicationStatus;
  matchScore?: number | null;
  matchReason?: string | null;
  mailSubject?: string | null;
  mailBody?: string | null;
  notes?: string | null;
  appliedAt: string;
  followupAt?: string | null;
  followupSent: boolean;
  sourceUrl?: string | null;
  updatedAt: string;
  profile?: { name: string } | null;
  statusHistory?: StatusHistoryEntry[];
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  changedAt: string;
  note?: string | null;
}

export interface KanbanColumn {
  id: ApplicationStatus;
  label: string;
  emoji: string;
  applications: Application[];
}

export type CreateApplicationInput = {
  company: string;
  role: string;
  hrEmail?: string;
  jobDescription?: string;
  mailSubject?: string;
  mailBody?: string;
  profileId?: string;
  matchScore?: number;
  matchReason?: string;
  notes?: string;
  followupAt?: string;
  sourceUrl?: string;
};

export type UpdateApplicationInput = Partial<CreateApplicationInput> & {
  status?: ApplicationStatus;
};
