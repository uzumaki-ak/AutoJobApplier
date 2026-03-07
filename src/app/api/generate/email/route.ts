import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/prisma"
import { generateEmail, classifyProfile } from "@/lib/ai/groq"
import { generateEmailMultiAgent } from "@/lib/ai/multi-agent"
import { logger } from "@/lib/logger"
import { getAuthenticatedUserId } from "@/lib/auth/mobile"
import { normalizeProfile } from "@/lib/profile-normalize"
import type { Profile } from "@/types/profile"

const genLogger = logger.child({ module: "api/generate/email" })

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    const { profileId, company, role, jobDescription, recruiterName, multiAgent } = body

    if (!company || !jobDescription) {
      return NextResponse.json(
        { success: false, error: "company and jobDescription are required" },
        { status: 400 }
      )
    }

    // Fetch all profiles for this user
    const profiles = await db.profile.findMany({ where: { userId } })
    if (profiles.length === 0) {
      return NextResponse.json(
        { success: false, error: "No profiles found. Create a profile first." },
        { status: 400 }
      )
    }

    const normalizedProfiles: Profile[] = profiles.map((profile) => normalizeProfile(profile))

    // Resolve which profile to use
    let profile = normalizedProfiles.find((p) => p.id === profileId)
    let autoSelectedReason = ""

    if (!profile || profileId === "auto") {
      if (normalizedProfiles.length === 1) {
        profile = normalizedProfiles[0]
        autoSelectedReason = "Only one profile available"
      } else {
        // Ask AI to pick the best profile
        const classification = await classifyProfile({
          jobDescription,
          role,
          profiles: normalizedProfiles.map((p) => ({
            id: p.id,
            name: p.name,
            title: p.title,
            skills: p.skills,
          })),
        })
        profile =
          normalizedProfiles.find((p) => p.id === classification.selected_profile_id) ??
          normalizedProfiles[0]
        autoSelectedReason = classification.reason
      }
    }

    genLogger.info({ userId, company, role, profileId: profile.id }, "Generating email")

    const email =
      multiAgent && process.env.EURI_API_KEY
        ? await generateEmailMultiAgent({
            profile,
            company,
            role,
            jobDescription,
            recruiterName,
          })
        : await generateEmail({
            profile,
            company,
            role,
            jobDescription,
            recruiterName,
          })

    return NextResponse.json({
      success: true,
      data: {
        subject:             email.subject,
        body:                email.body,
        usedProfileId:       profile.id,
        usedProfileName:     profile.name,
        autoSelectedReason,
      },
    })
  } catch (err) {
    genLogger.error({ err }, "POST /api/generate/email failed")
    return NextResponse.json({ success: false, error: "Email generation failed" }, { status: 500 })
  }
}
