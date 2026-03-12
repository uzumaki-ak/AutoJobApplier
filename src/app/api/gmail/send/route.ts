import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUserId } from "@/lib/auth/mobile";
import { db } from "@/lib/db/prisma";
import { sendGmailEmail } from "@/lib/gmail/client";
import { gmailLogger } from "@/lib/logger";

const Schema = z.object({
  applicationId: z.string(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  attachmentId: z.string().optional().nullable(),
  emailType: z.enum(["OUTREACH", "FOLLOWUP", "OTHER"]).default("OUTREACH"),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
    }

    const { applicationId, to, subject, body, attachmentId, emailType } = parsed.data;

    const application = await db.application.findFirst({
      where: { id: applicationId, userId },
    });

    if (!application) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }

    const { messageId, threadId } = await sendGmailEmail({
      userId,
      to,
      subject,
      body,
      attachmentId,
    });

    const sentAt = new Date();
    await db.$transaction(async (tx) => {
      await tx.email.create({
        data: {
          applicationId,
          subject,
          body,
          emailType,
          gmailThreadId: threadId,
        },
      });

      if (emailType === "OUTREACH" && application.status === "SAVED") {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            status: "APPLIED",
            hrEmail: to,
            mailSubject: subject,
            mailBody: body,
            appliedAt: sentAt,
            followupAt: new Date(sentAt.getTime() + 5 * 86400000),
          },
        });

        await tx.statusHistory.create({
          data: {
            applicationId,
            fromStatus: "SAVED",
            toStatus: "APPLIED",
          },
        });
      } else if (emailType === "FOLLOWUP") {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            followupSent: true,
            hrEmail: to,
            mailSubject: subject,
            mailBody: body,
          },
        });
      } else {
        await tx.application.update({
          where: { id: applicationId },
          data: {
            hrEmail: to,
            mailSubject: subject,
            mailBody: body,
          },
        });
      }
    });

    gmailLogger.info({ applicationId, messageId, emailType }, "Email sent via Gmail");
    return NextResponse.json({ success: true, data: { messageId } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Send failed";
    gmailLogger.error({ err }, "POST /api/gmail/send failed");

    if (message.includes("Gmail not connected") || message.includes("Gmail authorization expired")) {
      return NextResponse.json(
        {
          success: false,
          error: "Gmail connection expired. Open Settings in the web app and reconnect Gmail, then try again.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
