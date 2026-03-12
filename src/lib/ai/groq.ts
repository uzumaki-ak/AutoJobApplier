// [F61] src/lib/ai/groq.ts — Groq AI client
// Handles all text-based AI: email generation, scoring, follow-ups
// Model: llama-3.3-70b-versatile (free tier, very fast)

import Groq from "groq-sdk";
import { aiLogger } from "@/lib/logger";
import {
  buildEmailPrompt,
  buildFollowupPrompt,
  buildMatchScorePrompt,
  buildProfileClassifierPrompt,
  buildResumeExtractionPrompt,
  buildSubjectPrompt,
} from "./prompts";
import type { CreateProfileInput, Profile } from "@/types/profile";

// Singleton Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const MODEL = "llama-3.3-70b-versatile";

type GroqCallOptions = {
  temperature?: number;
  max_tokens?: number;
};

/** Call Groq and return text response */
async function callGroq(prompt: string, systemMsg?: string, options?: GroqCallOptions): Promise<string> {
  const start = Date.now();
  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: options?.temperature ?? 0.45,
      max_tokens: options?.max_tokens ?? 512,
      messages: [
        ...(systemMsg ? [{ role: "system" as const, content: systemMsg }] : []),
        { role: "user" as const, content: prompt },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    aiLogger.info(
      { model: MODEL, duration: Date.now() - start, tokens: response.usage?.total_tokens },
      "Groq call succeeded"
    );
    return text.trim();
  } catch (err) {
    aiLogger.error({ err, duration: Date.now() - start }, "Groq call failed");
    throw new Error("AI generation failed. Please try again.");
  }
}

/** Parse JSON safely from AI response (handles markdown code blocks) */
function parseJSON<T>(text: string): T {
  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const extracted = extractFirstJson(cleaned);
    if (extracted) {
      return JSON.parse(extracted) as T;
    }
    throw new Error("Invalid JSON from model");
  }
}

function extractFirstJson(text: string): string | null {
  const startIndex = text.search(/[\[{]/);
  if (startIndex === -1) return null;

  const startChar = text[startIndex];
  const endChar = startChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === startChar) depth += 1;
    if (ch === endChar) depth -= 1;

    if (depth === 0) {
      return text.slice(startIndex, i + 1);
    }
  }

  return null;
}

function buildFallbackProfile(resumeText: string): CreateProfileInput {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const emailMatch = resumeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = resumeText.match(/(\+?\d[\d\s().-]{7,}\d)/);
  const nameGuess = lines.find((line) => line.length <= 60) ?? "Imported Resume";
  const titleGuess =
    lines.find((line) => /(developer|engineer|designer|analyst|manager|intern|student)/i.test(line)) ??
    "Candidate";
  const experienceLevel = /senior|lead|principal|manager/i.test(resumeText)
    ? "SENIOR"
    : /mid|intermediate/i.test(resumeText)
      ? "MID"
      : /intern|fresher|student|junior/i.test(resumeText)
        ? "JUNIOR"
        : "JUNIOR";

  return {
    name: nameGuess || "Imported Resume",
    title: titleGuess || "Candidate",
    summary: "",
    contactEmail: emailMatch?.[0] ?? "",
    contactPhone: phoneMatch?.[0] ?? "",
    location: "",
    portfolioUrl: "",
    githubUrl: "",
    linkedinUrl: "",
    resumeUrl: "",
    skills: [],
    projects: [],
    experience: [],
    education: [],
    certifications: [],
    achievements: [],
    resumeText,
    experienceLevel,
    preferredRoles: titleGuess ? [titleGuess] : [],
    tonePreference: "confident",
    isDefault: false,
  };
}

// ─── Public API ────────────────────────────────────

/** Generate a personalized outreach email */
export async function generateEmail(opts: {
  profile: Profile;
  company: string;
  role: string;
  jobDescription: string;
  recruiterName?: string;
}): Promise<{ subject: string; body: string }> {
  const [body, subject] = await Promise.all([
    callGroq(buildEmailPrompt({ ...opts, tone: opts.profile.tonePreference ?? "confident" })),
    callGroq(
      buildSubjectPrompt({ role: opts.role, company: opts.company, candidateName: opts.profile.name })
    ),
  ]);
  return { subject, body };
}

/** Generate follow-up email */
export async function generateFollowup(opts: {
  originalEmail: string;
  company: string;
  role: string;
  daysAgo: number;
  candidateName: string;
}): Promise<string> {
  return callGroq(buildFollowupPrompt(opts));
}

/** Score candidate-job match, returns 0-100 + reason */
export async function scoreMatch(opts: {
  profile: Profile;
  jobDescription: string;
  role: string;
  company?: string;
}): Promise<{ match_score: number; reason: string; top_matching_skills: string[]; missing_skills: string[] }> {
  const raw = await callGroq(buildMatchScorePrompt(opts));
  try {
    return parseJSON(raw);
  } catch {
    aiLogger.warn({ raw }, "Failed to parse match score JSON, using defaults");
    return { match_score: 50, reason: "Unable to parse score", top_matching_skills: [], missing_skills: [] };
  }
}

/** Auto-select best profile for a given job */
export async function classifyProfile(opts: {
  jobDescription: string;
  role: string;
  profiles: Array<{ id: string; name: string; title: string; skills: string[] }>;
}): Promise<{ selected_profile_id: string; reason: string }> {
  const raw = await callGroq(buildProfileClassifierPrompt(opts));
  try {
    return parseJSON(raw);
  } catch {
    aiLogger.warn({ raw }, "Failed to parse profile classifier, using first profile");
    return { selected_profile_id: opts.profiles[0]?.id ?? "", reason: "Default selection" };
  }
}

/** Extract structured resume profile from raw text */
export async function extractProfileFromResumeText(opts: {
  resumeText: string;
}): Promise<CreateProfileInput> {
  const raw = await callGroq(buildResumeExtractionPrompt(opts), undefined, {
    temperature: 0.2,
    max_tokens: 900,
  });
  try {
    return parseJSON(raw);
  } catch {
    aiLogger.warn({ raw }, "Failed to parse resume extraction JSON");
    return buildFallbackProfile(opts.resumeText);
  }
}
