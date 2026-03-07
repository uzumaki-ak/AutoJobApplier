import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/prisma"
import { logger } from "@/lib/logger"
import { getAuthenticatedUserId } from "@/lib/auth/mobile"

const profileLogger = logger.child({ module: "api/profiles/[id]" })

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const profile = await db.profile.findUnique({ where: { id, userId } })
    if (!profile) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

    return NextResponse.json({ success: true, data: profile })
  } catch (err) {
    profileLogger.error({ err }, "GET /api/profiles/[id] failed")
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    // If setting as default, unset all others first
    if (body.isDefault) {
      await db.profile.updateMany({ where: { userId }, data: { isDefault: false } })
    }

    const profile = await db.profile.update({
      where: { id, userId },
      data:  body,
    })

    return NextResponse.json({ success: true, data: profile })
  } catch (err) {
    profileLogger.error({ err }, "PUT /api/profiles/[id] failed")
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    await db.profile.delete({ where: { id, userId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    profileLogger.error({ err }, "DELETE /api/profiles/[id] failed")
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 })
  }
}
