// [F63] src/lib/ai/prompts.ts - All AI prompt templates
// Centralized prompt management for email generation and profile matching.

import type { Profile } from "@/types/profile";

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}

function skillMatchesJob(skill: string, normalizedJobDescription: string): boolean {
  const normalizedSkill = normalizeForMatch(skill);
  if (!normalizedSkill) return false;
  if (normalizedJobDescription.includes(normalizedSkill)) return true;

  const tokens = normalizedSkill.split(" ").filter((token) => token.length >= 4);
  return tokens.some((token) => normalizedJobDescription.includes(token));
}

function extractJobKeywords(jobDescription: string): string[] {
  const normalized = normalizeForMatch(jobDescription);
  const keywordList = [
    "python",
    "django",
    "fastapi",
    "flask",
    "rag",
    "llm",
    "nlp",
    "embeddings",
    "vector database",
    "microservices",
    "aws",
    "gcp",
    "azure",
    "kafka",
    "postgresql",
    "mysql",
    "mongodb",
    "sql",
    "nosql",
    "api",
    "backend",
    "machine learning",
    "ai",
    "genai",
  ];

  return keywordList.filter((keyword) => skillMatchesJob(keyword, normalized)).slice(0, 12);
}

/** Build the email generation prompt */
export function buildEmailPrompt(opts: {
  profile: Profile;
  company: string;
  role: string;
  jobDescription: string;
  tone: string;
  recruiterName?: string;
}): string {
  const { profile, company, role, jobDescription, tone, recruiterName } = opts;
  const normalizedJobDescription = normalizeForMatch(jobDescription);

  const toneGuide: Record<string, string> = {
    confident: "Confident and direct. Executive tone with clear impact statements.",
    formal: "Professional, formal, and polished. Respectful language and structured paragraphs.",
    friendly: "Warm and approachable while staying professional. Natural, human phrasing.",
    direct: "Concise and to-the-point without sounding abrupt. Prioritize key impact.",
    startup: "Energetic and proactive. Show ownership and builder mindset, but stay professional.",
  };

  const links = [
    profile.portfolioUrl ? `Portfolio: ${profile.portfolioUrl}` : null,
    profile.githubUrl ? `GitHub: ${profile.githubUrl}` : null,
    profile.linkedinUrl ? `LinkedIn: ${profile.linkedinUrl}` : null,
    profile.resumeUrl ? `Resume: ${profile.resumeUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const contact = [
    profile.location ? `Location: ${profile.location}` : null,
    profile.contactEmail ? `Email: ${profile.contactEmail}` : null,
    profile.contactPhone ? `Phone: ${profile.contactPhone}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const experience = (profile.experience ?? [])
    .map((e) => {
      const dates = e.dates ? ` (${e.dates})` : "";
      const highlights = e.highlights ? ` - ${e.highlights}` : "";
      return `- ${e.role} @ ${e.company}${dates}${highlights}`;
    })
    .join("\n");

  const education = (profile.education ?? [])
    .map((e) => {
      const dates = e.dates ? ` (${e.dates})` : "";
      const details = e.details ? ` - ${e.details}` : "";
      return `- ${e.degree} | ${e.school}${dates}${details}`;
    })
    .join("\n");

  const certifications = (profile.certifications ?? []).join(", ");
  const achievements = (profile.achievements ?? []).join("\n");
  const overlapSkills = profile.skills.filter((skill) => skillMatchesJob(skill, normalizedJobDescription)).slice(0, 10);
  const nonOverlapSkills = profile.skills.filter((skill) => !skillMatchesJob(skill, normalizedJobDescription)).slice(0, 10);
  const jobKeywords = extractJobKeywords(jobDescription);

  const summaryLine = profile.summary ? `Summary: ${profile.summary}` : "";
  const linksBlock = links ? `Links:\n${links}` : "";
  const contactBlock = contact ? `Contact:\n${contact}` : "";

  return `You are an expert job outreach assistant.

Write a professional job application email. 170-240 words. No markdown.

CANDIDATE PROFILE:
Name: ${profile.name}
Title: ${profile.title}
${summaryLine}
Skills: ${profile.skills.join(", ")}
Experience Level: ${profile.experienceLevel}
Key Projects:
${profile.projects.map((p: { name: string; impact: string }) => `- ${p.name}: ${p.impact}`).join("\n")}
Experience:
${experience}
Education:
${education}
Certifications: ${certifications}
Achievements:
${achievements}
Preferred Roles: ${profile.preferredRoles.join(", ")}
${linksBlock}
${contactBlock}

JOB DETAILS:
Company: ${company}
Role: ${role}
${recruiterName ? `Recruiter: ${recruiterName}` : ""}
Job Description:
${jobDescription.slice(0, 2200)}
Detected Job Keywords: ${jobKeywords.join(", ") || "None"}
Profile-Job Overlap Skills: ${overlapSkills.join(", ") || "None"}
Profile Skills To Avoid Unless Directly Relevant: ${nonOverlapSkills.join(", ") || "None"}

TONE: ${toneGuide[tone] ?? toneGuide.confident}

EMAIL REQUIREMENTS:
1. Use a formal greeting ("Dear <Name>" if recruiter name is given; else "Dear Hiring Team")
2. Open with 1-2 sentences about applying for the role
3. Include exactly 3-4 bullet points showing only job-relevant skills/experience/projects
4. Add a short paragraph about why this company/role interests the candidate
5. If links are provided, add a "Links:" section with Portfolio/GitHub/LinkedIn
6. Do NOT invent links or contact details. If missing, omit them entirely.
7. Never mention technologies that are unrelated to this job posting.
8. If overlap is partial, frame it honestly as transferable backend experience; do not claim years or depth not evidenced.
9. Avoid repetition and generic filler language.
10. Do not paste resume-style paragraphs; write a focused application email tailored to this role.
11. End with a polite call to action and a full signature (name, location, email, phone if available)
12. Do NOT mention AI or automation
13. Output ONLY the email body (no subject line)`;
}

/** Build follow-up email prompt */
export function buildFollowupPrompt(opts: {
  originalEmail: string;
  company: string;
  role: string;
  daysAgo: number;
  candidateName: string;
}): string {
  return `Generate a short follow-up email for a job application. Max 80 words. No markdown.

Original application sent ${opts.daysAgo} days ago.
Company: ${opts.company}
Role: ${opts.role}
Candidate: ${opts.candidateName}

RULES:
1. Reference sending an application ${opts.daysAgo} days ago naturally
2. Do NOT sound desperate or impatient
3. Reiterate interest in ONE sentence
4. End with a simple question or call to action
5. Short. Very short. Under 80 words.
6. Output ONLY email body`;
}

/** Build match scoring prompt - returns JSON */
export function buildMatchScorePrompt(opts: {
  profile: Profile;
  jobDescription: string;
  role: string;
  company?: string;
}): string {
  const companyLine = opts.company ? `COMPANY: ${opts.company}\n` : "";
  return `Evaluate candidate-job fit. Return ONLY valid JSON, nothing else.

CANDIDATE SKILLS: ${opts.profile.skills.join(", ")}
CANDIDATE TITLE: ${opts.profile.title}
CANDIDATE LEVEL: ${opts.profile.experienceLevel}
${companyLine}JOB ROLE: ${opts.role}
JOB DESCRIPTION: ${opts.jobDescription.slice(0, 1500)}

Return EXACTLY this JSON structure:
{
  "match_score": <number 0-100>,
  "reason": "<one sentence explanation under 20 words>",
  "top_matching_skills": ["skill1", "skill2"],
  "missing_skills": ["skill1", "skill2"]
}`;
}

/** Build profile classifier prompt - auto-select best profile */
export function buildProfileClassifierPrompt(opts: {
  jobDescription: string;
  role: string;
  profiles: Array<{ id: string; name: string; title: string; skills: string[] }>;
}): string {
  return `Select the best resume profile for this job. Return ONLY valid JSON.

AVAILABLE PROFILES:
${opts.profiles.map((p) => `ID: ${p.id}, Name: ${p.name}, Title: ${p.title}, Skills: ${p.skills.slice(0, 8).join(", ")}`).join("\n")}

JOB ROLE: ${opts.role}
JOB DESCRIPTION: ${opts.jobDescription.slice(0, 1000)}

Return EXACTLY:
{
  "selected_profile_id": "<profile id>",
  "reason": "<one sentence under 15 words>"
}`;
}

/** Build resume extraction prompt - returns JSON */
export function buildResumeExtractionPrompt(opts: { resumeText: string }): string {
  return `Extract a structured resume profile from the text below. Return ONLY valid JSON, no markdown.

RESUME TEXT:
${opts.resumeText.slice(0, 6000)}

Return EXACTLY this JSON structure:
{
  "name": "<full name>",
  "title": "<target role/title>",
  "summary": "<short 1-2 sentence summary>",
  "contactEmail": "<email or empty string>",
  "contactPhone": "<phone or empty string>",
  "location": "<location or empty string>",
  "portfolioUrl": "<url or empty string>",
  "githubUrl": "<url or empty string>",
  "linkedinUrl": "<url or empty string>",
  "resumeUrl": "<url or empty string>",
  "skills": ["skill1", "skill2"],
  "projects": [{"name": "Project Name", "impact": "1-2 line impact"}],
  "experience": [{"role": "Role", "company": "Company", "dates": "Dates", "highlights": "Key impact"}],
  "education": [{"degree": "Degree", "school": "School", "dates": "Dates", "details": "Optional details"}],
  "certifications": ["cert1", "cert2"],
  "achievements": ["achievement1", "achievement2"],
  "experienceLevel": "<FRESHER | JUNIOR | MID | SENIOR | LEAD>",
  "preferredRoles": ["role1", "role2"],
  "tonePreference": "confident",
  "isDefault": false
}

Rules:
- If a field is not found, use empty string or empty array.
- Do NOT invent employers or projects; only use what appears in the text.`;
}

/** Email subject line generator */
export function buildSubjectPrompt(opts: {
  role: string;
  company: string;
  candidateName: string;
}): string {
  return `Generate a job application email subject line. One line only. No quotes.
Role: ${opts.role}
Company: ${opts.company}
Candidate: ${opts.candidateName}
Keep under 70 characters. Make it specific and professional.`;
}
