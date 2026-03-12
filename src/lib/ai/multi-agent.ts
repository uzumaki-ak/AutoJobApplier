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
  // Step 1: Generate a base draft using Groq.
  const draft = await generateEmail(opts);

  try {
    // Step 2: Strategist agent creates a role-relevant plan.
    const plan = await callEuriChat({
      temperature: 0.3,
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content:
            "You are a job application strategist. Build a concise role-targeted plan with: 1) opening, 2) top 3-4 bullet points mapped to job requirements, 3) company-fit paragraph, 4) links section only if links are provided, 5) closing/signature. Include only skills directly relevant to the posted role. If overlap is partial, keep claims honest and specific. Do NOT invent links or contact info.",
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

    // Step 3: Editor agent rewrites according to the plan.
    const refinedBody = await callEuriChat({
      temperature: 0.4,
      max_tokens: 1400,
      messages: [
        {
          role: "system",
          content:
            "You are an expert editor. Rewrite the email to be formal, specific, and role-relevant. Keep 170-240 words. Keep exactly 3-4 bullet points, each tied to job requirements. Do not mention unrelated stacks. If overlap is partial, position transferable skills honestly. Include links section only if links are provided. Do NOT invent links or contact info. Output only the email body.",
        },
        {
          role: "user",
          content: [`Plan:\n${plan}`, `\nDraft:\n${draft.body}`].join("\n"),
        },
      ],
    });

    return { subject: draft.subject, body: refinedBody || draft.body };
  } catch {
    return draft;
  }
}
