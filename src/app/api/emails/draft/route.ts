import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { getAuthenticatedUserId } from "@/lib/auth/mobile";

const emailLogger = logger.child({ module: "api/emails/draft" });

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { applicationId, subject, body: emailBody, emailType } = body ?? {};

    if (!applicationId || !subject || !emailBody) {
      return NextResponse.json(
        { success: false, error: "applicationId, subject and body are required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const app = await db.application.findFirst({ where: { id: applicationId, userId } });
    if (!app) return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });

    const draft = await db.email.create({
      data: {
        applicationId,
        subject,
        body: emailBody,
        emailType: emailType ?? "OUTREACH",
        isDraft: true,
      },
    });

    // Keep latest draft on application
    await db.application.update({
      where: { id: applicationId },
      data: { mailSubject: subject, mailBody: emailBody },
    });

    return NextResponse.json({ success: true, data: draft }, { status: 201 });
  } catch (err) {
    emailLogger.error({ err }, "POST /api/emails/draft failed");
    return NextResponse.json({ success: false, error: "Failed to save draft" }, { status: 500 });
  }
}
