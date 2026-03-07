import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/prisma"
import { logger } from "@/lib/logger"
import { getAuthenticatedUserId } from "@/lib/auth/mobile"

const profileLogger = logger.child({ module: "api/profiles" })

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const profiles = await db.profile.findMany({
      where:   { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    })

    return NextResponse.json({ success: true, data: profiles })
  } catch (err) {
    profileLogger.error({ err }, "GET /api/profiles failed")
    return NextResponse.json({ success: false, error: "Failed to fetch profiles" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      title,
      skills,
      projects,
      summary,
      contactEmail,
      contactPhone,
      location,
      portfolioUrl,
      githubUrl,
      linkedinUrl,
      experience,
      education,
      certifications,
      achievements,
      resumeText,
      resumeUrl,
      experienceLevel,
      preferredRoles,
      tonePreference,
      isDefault,
    } = body

    if (!name || !title) {
      return NextResponse.json({ success: false, error: "name and title are required" }, { status: 400 })
    }

    // If new profile is default, unset all others first
    if (isDefault) {
      await db.profile.updateMany({
        where: { userId },
        data:  { isDefault: false },
      })
    }

    const clean = (value: unknown) =>
      typeof value === "string" && value.trim().length > 0 ? value.trim() : null

    const profile = await db.profile.create({
      data: {
        userId,
        name,
        title,
        skills:          skills ?? [],
        projects:        projects ?? [],
        summary:         clean(summary),
        contactEmail:    clean(contactEmail),
        contactPhone:    clean(contactPhone),
        location:        clean(location),
        portfolioUrl:    clean(portfolioUrl),
        githubUrl:       clean(githubUrl),
        linkedinUrl:     clean(linkedinUrl),
        experience:      experience ?? [],
        education:       education ?? [],
        certifications:  certifications ?? [],
        achievements:    achievements ?? [],
        resumeText:      clean(resumeText),
        resumeUrl:       clean(resumeUrl),
        experienceLevel: experienceLevel ?? "MID",
        preferredRoles:  preferredRoles ?? [],
        tonePreference:  tonePreference ?? "confident",
        isDefault:       isDefault ?? false,
      },
    })

    return NextResponse.json({ success: true, data: profile }, { status: 201 })
  } catch (err) {
    profileLogger.error({ err }, "POST /api/profiles failed")
    return NextResponse.json({ success: false, error: "Failed to create profile" }, { status: 500 })
  }
}
