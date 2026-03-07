import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { getAuthenticatedUserId } from "@/lib/auth/mobile";
import { extractProfileFromResumeText } from "@/lib/ai/groq";
import pdfParse from "pdf-parse";

const importLogger = logger.child({ module: "api/profiles/import" });

async function readResumeText(req: NextRequest): Promise<{
  resumeText: string;
  isDefault?: boolean;
}> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    return {
      resumeText: typeof body.resumeText === "string" ? body.resumeText : "",
      isDefault: typeof body.isDefault === "boolean" ? body.isDefault : undefined,
    };
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const resumeText = form.get("resumeText");
    const isDefaultRaw = form.get("isDefault");
    const file = form.get("file");

    if (typeof resumeText === "string" && resumeText.trim().length > 0) {
      return {
        resumeText,
        isDefault: typeof isDefaultRaw === "string" ? isDefaultRaw === "true" : undefined,
      };
    }

    if (file instanceof File) {
      if (file.size > 6_000_000) {
        throw new Error("Resume file is too large (max 6MB).");
      }

      if (file.type === "application/pdf") {
        const buffer = Buffer.from(await file.arrayBuffer());
        const parsed = await pdfParse(buffer);
        return {
          resumeText: parsed.text ?? "",
          isDefault: typeof isDefaultRaw === "string" ? isDefaultRaw === "true" : undefined,
        };
      }

      if (file.type.startsWith("text/")) {
        const text = await file.text();
        return {
          resumeText: text,
          isDefault: typeof isDefaultRaw === "string" ? isDefaultRaw === "true" : undefined,
        };
      }

      throw new Error("Unsupported resume file type. Use PDF or text.");
    }
  }

  return { resumeText: "" };
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { resumeText, isDefault } = await readResumeText(req);
    if (!resumeText.trim()) {
      return NextResponse.json({ success: false, error: "resumeText or resume file is required" }, { status: 400 });
    }

    const extracted = await extractProfileFromResumeText({ resumeText });

    const profileCount = await db.profile.count({ where: { userId } });
    const shouldDefault = typeof isDefault === "boolean" ? isDefault : profileCount === 0;

    if (shouldDefault) {
      await db.profile.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    const clean = (value: unknown) =>
      typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

    const profile = await db.profile.create({
      data: {
        userId,
        name: extracted.name || "Imported Resume",
        title: extracted.title || "Candidate",
        summary: clean(extracted.summary),
        contactEmail: clean(extracted.contactEmail),
        contactPhone: clean(extracted.contactPhone),
        location: clean(extracted.location),
        portfolioUrl: clean(extracted.portfolioUrl),
        githubUrl: clean(extracted.githubUrl),
        linkedinUrl: clean(extracted.linkedinUrl),
        skills: extracted.skills ?? [],
        projects: extracted.projects ?? [],
        experience: extracted.experience ?? [],
        education: extracted.education ?? [],
        certifications: extracted.certifications ?? [],
        achievements: extracted.achievements ?? [],
        resumeText: clean(resumeText),
        resumeUrl: clean(extracted.resumeUrl),
        experienceLevel: extracted.experienceLevel ?? "JUNIOR",
        preferredRoles: extracted.preferredRoles ?? [],
        tonePreference: extracted.tonePreference ?? "confident",
        isDefault: shouldDefault,
      },
    });

    return NextResponse.json({ success: true, data: profile }, { status: 201 });
  } catch (err) {
    importLogger.error({ err }, "POST /api/profiles/import failed");
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
