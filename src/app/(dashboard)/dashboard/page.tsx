// [F08] src/app/(dashboard)/dashboard/page.tsx — Main dashboard
// Shows stats, recent applications, quick generate shortcut

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/prisma";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { QuickGenerate } from "@/components/dashboard/quick-generate";
import Link from "next/link";
import { formatDate, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";

async function getDashboardData(userId: string) {
  const [applications, totalProfiles] = await Promise.all([
    db.application.findMany({
      where: { userId },
      orderBy: { appliedAt: "desc" },
      take: 5,
      include: { profile: { select: { name: true } } },
    }),
    db.profile.count({ where: { userId } }),
  ]);

  const stats = await db.application.groupBy({
    by: ["status"],
    where: { userId },
    _count: true,
  });

  const statusMap = Object.fromEntries(stats.map((s) => [s.status, s._count]));

  return {
    recentApplications: applications,
    totalProfiles,
    stats: {
      total: stats.reduce((sum, s) => sum + s._count, 0),
      interviews: statusMap.INTERVIEW ?? 0,
      offers: statusMap.OFFER ?? 0,
      applied: statusMap.APPLIED ?? 0,
    },
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const { recentApplications, totalProfiles, stats } = await getDashboardData(userId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)]">
          DASHBOARD
        </h1>
        <p className="text-[var(--color-muted-foreground)] text-sm mt-1">
          Welcome back, {session?.user?.name?.split(" ")[0]}
        </p>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Generate */}
        <div className="lg:col-span-1">
          <QuickGenerate hasProfiles={totalProfiles > 0} />
        </div>

        {/* Recent Applications */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-sm font-semibold text-[var(--color-foreground)] tracking-wide">
                RECENT APPLICATIONS
              </h2>
              <Link
                href="/applications"
                className="text-xs text-[var(--color-primary)] hover:underline"
              >
                View all →
              </Link>
            </div>

            {recentApplications.length === 0 ? (
              <div className="text-center py-10 text-[var(--color-muted-foreground)]">
                <p className="text-sm">No applications yet.</p>
                <Link href="/generate" className="text-[var(--color-primary)] text-sm hover:underline mt-2 inline-block">
                  Generate your first email →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentApplications.map((app) => {
                  const colors = STATUS_COLORS[app.status];
                  return (
                    <Link
                      key={app.id}
                      href={`/applications/${app.id}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-muted)] hover:bg-[var(--color-accent)] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-[var(--color-foreground)] truncate">
                          {app.company}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)] truncate">
                          {app.role} • {formatDate(app.appliedAt)}
                        </p>
                      </div>
                      <span className={`ml-3 shrink-0 text-xs px-2 py-1 rounded-lg ${colors.bg} ${colors.text}`}>
                        {STATUS_LABELS[app.status]}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
