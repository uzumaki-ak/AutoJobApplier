// [F03] src/app/page.tsx — Landing page / redirect
// If logged in → /dashboard, if not → show landing

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background)] px-4">
      <div className="text-center max-w-2xl mx-auto space-y-8">
        {/* Logo */}
        <div className="space-y-3">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-[var(--color-primary)] tracking-wider">
            OUTREACH.AI
          </h1>
          <p className="text-[var(--color-muted-foreground)] text-lg">
            AI-powered job applications. From post to email in seconds.
          </p>
        </div>

        {/* Feature bullets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-left">
          {[
            "📸 Screenshot → Instant email",
            "🧠 AI picks the right resume",
            "📊 Kanban application tracker",
            "⏰ Auto follow-up reminders",
            "🔍 Match scoring per role",
            "📧 One-click Gmail send",
          ].map((f) => (
            <div
              key={f}
              className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-muted)] text-[var(--color-foreground)]"
            >
              {f}
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/sign-in"
          className="inline-block px-8 py-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-semibold font-display tracking-wide text-sm hover:opacity-90 transition-opacity"
        >
          GET STARTED →
        </Link>
      </div>
    </main>
  );
}
