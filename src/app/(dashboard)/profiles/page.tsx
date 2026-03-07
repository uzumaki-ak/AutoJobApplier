// [F12] src/app/(dashboard)/profiles/page.tsx — Resume profiles management

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/prisma";
import { ProfileCard } from "@/components/profiles/profile-card";
import { ProfileForm } from "@/components/profiles/profile-form";
import { ResumeImport } from "@/components/profiles/resume-import";

export default async function ProfilesPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const profiles = await db.profile.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)]">
            RESUME PROFILES
          </h1>
          <p className="text-[var(--color-muted-foreground)] text-sm mt-1">
            Create different profiles for different types of roles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ResumeImport />
          <ProfileForm mode="create" />
        </div>
      </div>

      {profiles.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center space-y-3">
          <p className="text-[var(--color-muted-foreground)]">No profiles yet. Create your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile as Parameters<typeof ProfileCard>[0]["profile"]} />
          ))}
        </div>
      )}
    </div>
  );
}
