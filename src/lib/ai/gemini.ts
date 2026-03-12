// [F62] src/lib/ai/gemini.ts — Gemini Vision client
// Handles image-based job description extraction
// Model: gemini-1.5-flash (free tier: 15 RPM)
// Used when user uploads screenshot of LinkedIn/job post

import { GoogleGenerativeAI } from "@google/generative-ai";
import { aiLogger } from "@/lib/logger";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export interface ExtractedJobData {
  company: string;
  role: string;
  hrEmail?: string;
  recruiterName?: string;
  jobDescription: string;
  location?: string;
  skills: string[];
}

export class EmptyExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmptyExtractionError";
  }
}

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

function findVisibleEmail(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) continue;
    const match = value.match(EMAIL_REGEX);
    if (match) {
      return match[0].trim();
    }
  }
  return undefined;
}

function parseJsonFromText(text: string): ExtractedJobData {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned) as ExtractedJobData;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const slice = cleaned.slice(start, end + 1);
      return JSON.parse(slice) as ExtractedJobData;
    }
    throw new Error("Failed to parse JSON from model response.");
  }
}

function normalizeExtractedJobData(value: ExtractedJobData): ExtractedJobData {
  const cleanString = (input: unknown) => (typeof input === "string" ? input.trim() : "");
  const cleanOptional = (input: unknown) =>
    typeof input === "string" && input.trim().length > 0 ? input.trim() : undefined;
  const cleanSkills = (input: unknown) =>
    Array.isArray(input)
      ? input
          .filter((item) => typeof item === "string" && item.trim().length > 0)
          .map((item) => (item as string).trim())
      : [];

  const company = cleanString(value.company);
  const role = cleanString(value.role);
  const recruiterName = cleanOptional(value.recruiterName);
  const jobDescription = cleanString(value.jobDescription);
  const location = cleanOptional(value.location);
  const skills = cleanSkills(value.skills);
  const hrEmail = cleanOptional(value.hrEmail) ?? findVisibleEmail(jobDescription, recruiterName, company, role);

  return {
    company,
    role,
    hrEmail,
    recruiterName,
    jobDescription,
    location,
    skills,
  };
}

function isEmptyExtraction(value: ExtractedJobData): boolean {
  return (
    value.company.length === 0 &&
    value.role.length === 0 &&
    value.jobDescription.length === 0 &&
    (!value.hrEmail || value.hrEmail.length === 0) &&
    (!value.recruiterName || value.recruiterName.length === 0) &&
    (!value.location || value.location.length === 0) &&
    value.skills.length === 0
  );
}

/** Extract job details from a screenshot/image using Gemini Vision */
export async function extractJobFromImage(
  base64Image: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg"
): Promise<ExtractedJobData> {
  const start = Date.now();

  const primaryPrompt = `You are an OCR + extraction engine. Read ALL visible text in the image first, then map to JSON.

Important extraction rules:
- If the role appears as a hashtag (e.g. "#AccountManagerIntern"), return "Account Manager Intern".
- If the company appears after "Work From Home |" or after "Join", use that as company.
- Include the full job description text and bullet points if visible.
- If any email address is visible anywhere, especially blue/clickable text, capture it exactly in hrEmail.
- Do NOT invent details. If not visible, use empty string or null.

Return ONLY valid JSON, no markdown.

Return exactly:
{
  "company": "<company name or empty string>",
  "role": "<job title/role or empty string>",
  "hrEmail": "<email if visible, else null>",
  "recruiterName": "<recruiter/poster name if visible, else null>",
  "jobDescription": "<full job description text extracted>",
  "location": "<location if visible, else null>",
  "skills": ["<skill1>", "<skill2>"]
}

Extract ALL visible text. If something is not visible, use empty string or null.`;

  const retryPrompt = `The previous output was empty or missing key fields. Try again and be extra careful.

Checklist:
- Look at the top headline and hashtags for the role.
- Look for the company near "Work From Home |" or in the sentence "Join <company>".
- Capture bullet points into jobDescription.
- If you can read any text, do not return empty strings.

Return ONLY valid JSON using the exact schema.`;

  try {
    const prompts = [primaryPrompt, retryPrompt];
    let lastParsed: ExtractedJobData | null = null;

    for (let attempt = 0; attempt < prompts.length; attempt += 1) {
      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType,
          },
        },
        prompts[attempt],
      ]);

      const text = result.response.text().trim();
      const parsed = normalizeExtractedJobData(parseJsonFromText(text));
      lastParsed = parsed;

      aiLogger.info(
        {
          attempt: attempt + 1,
          company: parsed.company,
          role: parsed.role,
          duration: Date.now() - start,
        },
        "Gemini vision extraction attempt completed"
      );

      if (!isEmptyExtraction(parsed)) {
        return parsed;
      }

      aiLogger.warn({ attempt: attempt + 1 }, "Gemini vision extraction returned empty fields");
    }

    throw new EmptyExtractionError("No readable text found in the image. Try a clearer screenshot.");
  } catch (err) {
    aiLogger.error({ err, duration: Date.now() - start }, "Gemini vision extraction failed");
    if (err instanceof EmptyExtractionError) throw err;
    throw new Error("Failed to extract job data from image. Please try again or paste manually.");
  }
}

/** Extract job details from LinkedIn URL page content */
export async function extractJobFromText(rawText: string): Promise<ExtractedJobData> {
  const start = Date.now();

  const prompt = `Extract structured job information from this raw text. Return ONLY valid JSON.

TEXT:
${rawText.slice(0, 4000)}

Return exactly:
{
  "company": "<company name>",
  "role": "<job title>",
  "hrEmail": null,
  "recruiterName": null,
  "jobDescription": "<cleaned job description>",
  "location": "<location or null>",
  "skills": ["<skill1>", "<skill2>"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = normalizeExtractedJobData(JSON.parse(cleaned) as ExtractedJobData);

    aiLogger.info({ company: parsed.company, role: parsed.role, duration: Date.now() - start }, "Text extraction done");
    return parsed;
  } catch (err) {
    aiLogger.error({ err }, "Text extraction failed");
    throw new Error("Failed to parse job text.");
  }
}
