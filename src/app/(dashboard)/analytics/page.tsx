// [F13] src/app/(dashboard)/analytics/page.tsx — Analytics & charts

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/prisma";
import { ApplicationChart } from "@/components/analytics/application-chart";
import { StatusPie } from "@/components/analytics/status-pie";
import { ResponseTimeline } from "@/components/analytics/response-timeline";

async function getAnalyticsData(userId: string) {
  const applications = await db.application.findMany({
    where: { userId },
    select: {
      appliedAt: true,
      status: true,
      matchScore: true,
      company: true,
      role: true,
    },
    orderBy: { appliedAt: "asc" },
  });

  // Apps per month for last 6 months
  const monthlyData: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    monthlyData[key] = 0;
  }
  applications.forEach((app) => {
    const key = new Date(app.appliedAt).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    if (key in monthlyData) monthlyData[key]++;
  });

  // Status distribution
  const statusDist: Record<string, number> = {};
  applications.forEach((app) => {
    statusDist[app.status] = (statusDist[app.status] ?? 0) + 1;
  });

  // Summary stats
  const total = applications.length;
  const interviews = statusDist.INTERVIEW ?? 0;
  const offers = statusDist.OFFER ?? 0;
  const avgScore =
    applications.filter((a) => a.matchScore != null).reduce((sum, a) => sum + (a.matchScore ?? 0), 0) /
      (applications.filter((a) => a.matchScore != null).length || 1);

  return {
    monthlyData: Object.entries(monthlyData).map(([month, count]) => ({ month, count })),
    statusDist: Object.entries(statusDist).map(([status, count]) => ({ status, count })),
    stats: {
      total,
      interviewRate: total > 0 ? Math.round((interviews / total) * 100) : 0,
      offerRate: total > 0 ? Math.round((offers / total) * 100) : 0,
      avgScore: Math.round(avgScore),
    },
  };
}

export default async function AnalyticsPage() {
  const session = await auth();
  const data = await getAnalyticsData(session!.user!.id!);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)]">ANALYTICS</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Applied", value: data.stats.total, suffix: "" },
          { label: "Interview Rate", value: data.stats.interviewRate, suffix: "%" },
          { label: "Offer Rate", value: data.stats.offerRate, suffix: "%" },
          { label: "Avg Match Score", value: data.stats.avgScore, suffix: "%" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-4 text-center">
            <p className="font-display text-3xl font-bold text-[var(--color-primary)]">
              {s.value}{s.suffix}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          <h2 className="font-display text-sm font-semibold text-[var(--color-foreground)] mb-4">
            APPLICATIONS PER MONTH
          </h2>
          <ApplicationChart data={data.monthlyData} />
        </div>
        <div className="glass rounded-2xl p-5">
          <h2 className="font-display text-sm font-semibold text-[var(--color-foreground)] mb-4">
            STATUS BREAKDOWN
          </h2>
          <StatusPie data={data.statusDist} />
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="font-display text-sm font-semibold text-[var(--color-foreground)] mb-4">
          ACTIVITY TIMELINE
        </h2>
        <ResponseTimeline data={data.monthlyData} />
      </div>
    </div>
  );
}
