import type { Profile } from "@/types/profile";
import { callEuriChat } from "@/lib/ai/euri";
import { generateEmail } from "@/lib/ai/groq";

type MultiAgentEmailOpts = {
  profile: Profile;
  company: string;
  role: string;
  jobDescription: string;
  recruiterName?: string;
};

export async function generateEmailMultiAgent(opts: MultiAgentEmailOpts): Promise<{ subject: string; body: string }> {
  // Step 1: Generate a strong base draft using Groq (fast)
  const draft = await generateEmail(opts);

  try {
    // Step 2: Strategist agent (Euri) — outline key points to emphasize
    const plan = await callEuriChat({
      temperature: 0.3,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content:
            "You are a job application strategist. Create a concise plan for a strong email: 1) opening, 2) top 3-5 bullet points, 3) company-fit paragraph, 4) links section (only if provided), 5) closing/signature. Do NOT invent links or contact info. Avoid repeating ideas.",
        },
        {
          role: "user",
          content: [
            `Candidate: ${opts.profile.name} - ${opts.profile.title}`,
            `Company: ${opts.company}`,
            `Role: ${opts.role}`,
            `Job Description:\n${opts.jobDescription.slice(0, 1600)}`,
            `Skills: ${opts.profile.skills.join(", ")}`,
            `Projects: ${opts.profile.projects.map((p) => `${p.name}: ${p.impact}`).join("; ")}`,
            `Links: ${[
              opts.profile.portfolioUrl && `Portfolio ${opts.profile.portfolioUrl}`,
              opts.profile.githubUrl && `GitHub ${opts.profile.githubUrl}`,
              opts.profile.linkedinUrl && `LinkedIn ${opts.profile.linkedinUrl}`,
            ]
              .filter(Boolean)
              .join(" | ")}`,
          ].join("\n"),
        },
      ],
    });

    // Step 3: Editor agent (Euri) — rewrite the draft using the plan
    const refinedBody = await callEuriChat({
      temperature: 0.4,
      max_tokens: 1400,
      messages: [
        {
          role: "system",
          content:
            "You are an expert editor. Rewrite the email to be detailed, formal, and specific. Keep 260-360 words. Include a links section only if links are provided. Do NOT invent links or contact info. Avoid repetition. Output only the email body.",
        },
        {
          role: "user",
          content: [
            `Plan:\n${plan}`,
            `\nDraft:\n${draft.body}`,
          ].join("\n"),
        },
      ],
    });

    return { subject: draft.subject, body: refinedBody || draft.body };
  } catch {
    return draft;
  }
}
