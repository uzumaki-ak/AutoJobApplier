import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/prisma"
import { scoreMatch } from "@/lib/ai/groq"
import { logger } from "@/lib/logger"
import { getAuthenticatedUserId } from "@/lib/auth/mobile"
import { normalizeProfile } from "@/lib/profile-normalize"
import type { Profile } from "@/types/profile"

const appLogger = logger.child({ module: "api/applications" })

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")

    const applications = await db.application.findMany({
      where:   { userId, ...(status ? { status: status as never } : {}) },
      orderBy: { appliedAt: "desc" },
      include: { emails: { orderBy: { sentAt: "desc" }, take: 1 } },
    })

    return NextResponse.json({ success: true, data: applications })
  } catch (err) {
    appLogger.error({ err }, "GET /api/applications failed")
    return NextResponse.json({ success: false, error: "Failed to fetch applications" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const {
      company, role, hrEmail, jobDescription,
      mailSubject, mailBody, profileId, sourceUrl, followupAt,
    } = body

    if (!company || !role) {
      return NextResponse.json({ success: false, error: "company and role are required" }, { status: 400 })
    }

    // Duplicate check
    const existing = await db.application.findFirst({
      where: {
        userId,
        company: { equals: company, mode: "insensitive" },
        role:    { equals: role,    mode: "insensitive" },
      },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Already tracking this role", data: existing },
        { status: 409 }
      )
    }

    // Auto match score if we have profile + job description
    let matchScore: number | null = null
    let matchReason = ""
    if (profileId && jobDescription) {
      try {
        const profile = await db.profile.findUnique({ where: { id: profileId, userId } })
        if (profile) {
          const normalizedProfile: Profile = normalizeProfile(profile)
          const scored = await scoreMatch({
            profile: normalizedProfile,
            company,
            role,
            jobDescription,
          })
          matchScore = scored.match_score
          matchReason = scored.reason
        }
      } catch (e) {
        appLogger.warn({ e }, "Match scoring failed — continuing without score")
      }
    }

    const application = await db.application.create({
      data: {
        userId,
        company,
        role,
        hrEmail:     hrEmail ?? null,
        jobDescription: jobDescription ?? null,
        mailSubject: mailSubject ?? null,
        mailBody:    mailBody ?? null,
        profileId:   profileId ?? null,
        sourceUrl:   sourceUrl ?? null,
        status:      "SAVED",
        matchScore,
        matchReason,
        followupAt:  followupAt ? new Date(followupAt) : new Date(Date.now() + 5 * 86400000),
      },
    })

    return NextResponse.json({ success: true, data: application }, { status: 201 })
  } catch (err) {
    appLogger.error({ err }, "POST /api/applications failed")
    return NextResponse.json({ success: false, error: "Failed to create application" }, { status: 500 })
  }
}
