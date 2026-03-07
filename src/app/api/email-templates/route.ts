import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { getAuthenticatedUserId } from "@/lib/auth/mobile";

const templateLogger = logger.child({ module: "api/email-templates" });

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const templates = await db.emailTemplate.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (err) {
    templateLogger.error({ err }, "GET /api/email-templates failed");
    return NextResponse.json({ success: false, error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, subject, body: templateBody } = body ?? {};

    if (!name || !subject || !templateBody) {
      return NextResponse.json(
        { success: false, error: "name, subject and body are required" },
        { status: 400 }
      );
    }

    const template = await db.emailTemplate.create({
      data: {
        userId,
        name,
        subject,
        body: templateBody,
      },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (err) {
    templateLogger.error({ err }, "POST /api/email-templates failed");
    return NextResponse.json({ success: false, error: "Failed to save template" }, { status: 500 });
  }
}
