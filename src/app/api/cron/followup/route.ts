// [F27] src/app/api/cron/followup/route.ts — Vercel Cron: daily follow-up check
// Runs daily via vercel.json cron config
// Finds applications due for follow-up, generates AI email, sends Resend notification
// Secured with CRON_SECRET env var

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";
import { generateFollowup } from "@/lib/ai/groq";
import { sendFollowupReminder } from "@/lib/email/resend";
import { cronLogger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  // ── Security: only allow cron calls ─────────────
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    cronLogger.warn({ ip: req.headers.get("x-forwarded-for") }, "Unauthorized cron attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const results = { processed: 0, notified: 0, errors: 0 };

  try {
    // Find apps: no reply, followup date passed, not yet sent
    const dueApplications = await db.application.findMany({
      where: {
        followupSent: false,
        followupAt: { lte: new Date() },
        status: { in: ["APPLIED", "NO_RESPONSE"] },
      },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    cronLogger.info({ count: dueApplications.length }, "Processing follow-up queue");

    for (const app of dueApplications) {
      try {
        const daysAgo = Math.floor((Date.now() - app.appliedAt.getTime()) / 86400000);

        // Generate follow-up email
        const followupBody = await generateFollowup({
          originalEmail: app.mailBody ?? "",
          company: app.company,
          role: app.role,
          daysAgo,
          candidateName: app.user.name ?? "Candidate",
        });

        // Store generated follow-up email (not yet sent — user sends manually)
        await db.email.create({
          data: {
            applicationId: app.id,
            subject: `Follow-up: ${app.role} at ${app.company}`,
            body: followupBody,
            emailType: "FOLLOWUP",
          },
        });

        // Send notification email to user
        await sendFollowupReminder({
          toEmail: app.user.email,
          toName: app.user.name ?? "there",
          company: app.company,
          role: app.role,
          applicationId: app.id,
          appUrl,
        });

        results.processed++;
        results.notified++;
      } catch (err) {
        cronLogger.error({ err, applicationId: app.id }, "Failed to process follow-up");
        results.errors++;
      }
    }

    cronLogger.info(results, "Cron follow-up run complete");
    return NextResponse.json({ success: true, ...results });
  } catch (err) {
    cronLogger.error({ err }, "Cron job failed entirely");
    return NextResponse.json({ success: false, error: "Cron failed" }, { status: 500 });
  }
}
