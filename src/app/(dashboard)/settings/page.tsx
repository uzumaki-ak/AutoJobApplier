// [F14] src/app/(dashboard)/settings/page.tsx — Settings: Gmail connect, preferences

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/prisma";
import { getGmailAuthUrl } from "@/lib/gmail/client";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { gmailRefreshToken: true, email: true, name: true, image: true },
  });

  const gmailConnected = !!user?.gmailRefreshToken;
  const gmailAuthUrl = getGmailAuthUrl();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)]">SETTINGS</h1>

      {/* Profile info */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-display text-sm font-semibold text-[var(--color-foreground)]">ACCOUNT</h2>
        <div className="flex items-center gap-4">
          {user?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="avatar" className="w-12 h-12 rounded-full" />
          )}
          <div>
            <p className="font-medium text-[var(--color-foreground)]">{user?.name}</p>
            <p className="text-sm text-[var(--color-muted-foreground)]">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Gmail Connection */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-display text-sm font-semibold text-[var(--color-foreground)]">GMAIL CONNECTION</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Connect Gmail to send emails directly from the app. Uses OAuth — your password is never stored.
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${gmailConnected ? "bg-green-400" : "bg-red-400"}`} />
            <span className="text-sm text-[var(--color-foreground)]">
              {gmailConnected ? "Connected" : "Not connected"}
            </span>
          </div>
          {!gmailConnected ? (
            <a
              href={gmailAuthUrl}
              className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-sm font-medium hover:opacity-90"
            >
              Connect Gmail
            </a>
          ) : (
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Emails will be sent from your Gmail account
            </span>
          )}
        </div>
      </div>

      {/* API Keys info */}
      <div className="glass rounded-2xl p-6 space-y-3">
        <h2 className="font-display text-sm font-semibold text-[var(--color-foreground)]">AI MODELS</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-muted-foreground)]">Text Generation</span>
            <span className="text-[var(--color-foreground)]">Groq LLaMA 3.3 70B</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-muted-foreground)]">Vision (screenshots)</span>
            <span className="text-[var(--color-foreground)]">Gemini 1.5 Flash</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-muted-foreground)]">Notifications</span>
            <span className="text-[var(--color-foreground)]">Resend</span>
          </div>
        </div>
      </div>
    </div>
  );
}
