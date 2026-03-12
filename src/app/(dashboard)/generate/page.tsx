// [F11] src/app/(dashboard)/generate/page.tsx — Email generator page

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/prisma";
import { GenerateForm } from "@/components/generate/generate-form";
import Link from "next/link";

export default async function GeneratePage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const profiles = await db.profile.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  const typedProfiles = profiles.map(profile => ({
    ...profile,
    projects: Array.isArray(profile.projects) ? profile.projects : [],
  })) as unknown as Parameters<typeof GenerateForm>[0]["profiles"];

  if (profiles.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
        <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)]">
          SET UP YOUR PROFILE FIRST
        </h1>
        <p className="text-[var(--color-muted-foreground)]">
          You need at least one resume profile to generate emails.
        </p>
        <Link
          href="/profiles"
          className="inline-block px-6 py-3 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-semibold text-sm hover:opacity-90"
        >
          Create Profile →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)]">
          GENERATE EMAIL
        </h1>
        <p className="text-[var(--color-muted-foreground)] text-sm mt-1">
          Upload a screenshot, paste text, or enter a URL
        </p>
      </div>

      <GenerateForm profiles={typedProfiles as Parameters<typeof GenerateForm>[0]["profiles"]} />
    </div>
  );
}
