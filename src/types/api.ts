// [F73] src/types/api.ts — API request/response types

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GenerateEmailRequest {
  profileId: string;
  company: string;
  role: string;
  jobDescription: string;
  recruiterName?: string;
  multiAgent?: boolean;
}

export interface GenerateEmailResponse {
  subject: string;
  body: string;
}

export interface MatchScoreRequest {
  profileId: string;
  jobDescription: string;
  role: string;
  company?: string;
}

export interface MatchScoreResponse {
  match_score: number;
  reason: string;
  top_matching_skills: string[];
  missing_skills: string[];
}

export interface ExtractImageRequest {
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}

export interface ExtractUrlRequest {
  url: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingApplication?: {
    id: string;
    company: string;
    role: string;
    status: string;
    appliedAt: string;
  };
}
