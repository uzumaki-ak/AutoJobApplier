// [F65] src/lib/email/resend.ts — Resend client for system notifications
// Used for: follow-up reminders, welcome emails, system alerts
// NOT used for job outreach (that goes through Gmail API)
// Free: 3,000 emails/month

import { Resend } from "resend";
import { logger } from "@/lib/logger";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@yourdomain.com";

/** Send follow-up reminder notification to user */
export async function sendFollowupReminder(opts: {
  toEmail: string;
  toName: string;
  company: string;
  role: string;
  applicationId: string;
  appUrl: string;
}): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.toEmail,
      subject: `Follow up with ${opts.company} — it's been 5 days`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">⏰ Time to Follow Up</h2>
          <p>Hey ${opts.toName},</p>
          <p>You applied for <strong>${opts.role}</strong> at <strong>${opts.company}</strong> 5 days ago — no reply yet.</p>
          <p>A short follow-up email can increase your chances significantly.</p>
          <a href="${opts.appUrl}/applications/${opts.applicationId}"
             style="display:inline-block;padding:10px 20px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;">
            Generate Follow-Up →
          </a>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">AI Job Outreach</p>
        </div>
      `,
    });

    logger.info({ toEmail: opts.toEmail, company: opts.company }, "Follow-up reminder sent");
  } catch (err) {
    logger.error({ err, toEmail: opts.toEmail }, "Failed to send follow-up reminder");
    // Non-fatal — don't throw, cron should continue
  }
}

/** Send welcome email to new users */
export async function sendWelcomeEmail(opts: { toEmail: string; toName: string }): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.toEmail,
      subject: "Welcome to AI Job Outreach 🚀",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Welcome aboard, ${opts.toName}!</h2>
          <p>Your AI-powered job outreach system is ready.</p>
          <p><strong>Quick start:</strong></p>
          <ol>
            <li>Set up your resume profiles</li>
            <li>Connect your Gmail (optional)</li>
            <li>Generate your first outreach email</li>
          </ol>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">AI Job Outreach</p>
        </div>
      `,
    });
  } catch (err) {
    logger.error({ err, toEmail: opts.toEmail }, "Failed to send welcome email");
  }
}
