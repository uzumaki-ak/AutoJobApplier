// [F26] src/app/api/gmail/send/route.ts — Send email via Gmail API
// POST: sends email using user's connected Gmail account
// Also logs the sent email in the emails table

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { sendGmailEmail } from "@/lib/gmail/client";
import { gmailLogger } from "@/lib/logger";
import { getAuthenticatedUserId } from "@/lib/auth/mobile";
import { z } from "zod";

const Schema = z.object({
  applicationId: z.string(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  emailType: z.enum(["OUTREACH", "FOLLOWUP", "OTHER"]).default("OUTREACH"),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });

    const { applicationId, to, subject, body, emailType } = parsed.data;

    // Verify application belongs to user
    const app = await db.application.findFirst({ where: { id: applicationId, userId } });
    if (!app) return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });

    // Send via Gmail API
    const { messageId, threadId } = await sendGmailEmail({ userId, to, subject, body });

    // Log email in DB
    await db.email.create({
      data: {
        applicationId,
        subject,
        body,
        emailType,
        gmailThreadId: threadId,
      },
    });

    // Update followupSent if this is a follow-up
    if (emailType === "FOLLOWUP") {
      await db.application.update({
        where: { id: applicationId },
        data: { followupSent: true },
      });
    }

    gmailLogger.info({ applicationId, messageId, emailType }, "Email sent via Gmail");
    return NextResponse.json({ success: true, data: { messageId } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Send failed";
    gmailLogger.error({ err }, "Gmail send failed");

    if (message.includes("Gmail not connected")) {
      return NextResponse.json(
        {
          success: false,
          error: "Gmail isn’t connected yet. Open Settings in the web app and connect Gmail, then try again.",
        },
        { status: 403 }
      );
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
