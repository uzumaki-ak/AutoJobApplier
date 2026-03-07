// [F04] src/app/(auth)/layout.tsx — Auth layout
// Centered card layout for sign-in/sign-up pages

import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Already logged in — go to dashboard
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-[var(--color-primary)] tracking-wider">
            OUTREACH.AI
          </h1>
        </div>
        {/* Auth card with glass effect */}
        <div className="glass rounded-2xl p-8 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
