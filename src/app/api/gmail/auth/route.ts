// [F25] src/app/api/gmail/auth/route.ts — Gmail OAuth connect + callback
// GET /api/gmail/auth → redirects to Gmail OAuth consent
// GET /api/gmail/auth/callback → exchanges code, stores tokens

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getGmailAuthUrl, exchangeGmailCode } from "@/lib/gmail/client";
import { gmailLogger } from "@/lib/logger";

/** GET /api/gmail/auth — start OAuth flow */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  // ── Callback from Google ─────────────────────────
  if (code) {
    try {
      await exchangeGmailCode(session.user.id, code);
      gmailLogger.info({ userId: session.user.id }, "Gmail connected successfully");
      return NextResponse.redirect(new URL("/settings?gmail=connected", req.url));
    } catch (err) {
      gmailLogger.error({ err, userId: session.user.id }, "Gmail code exchange failed");
      return NextResponse.redirect(new URL("/settings?gmail=error", req.url));
    }
  }

  // ── Initial redirect to Google ───────────────────
  const authUrl = getGmailAuthUrl();
  return NextResponse.redirect(authUrl);
}
