// [F09] src/app/(dashboard)/applications/page.tsx - Kanban board page

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/prisma";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import type { Application } from "@/types/application";

async function getApplications(userId: string) {
  const applications = await db.application.findMany({
    where: { userId },
    orderBy: { appliedAt: "desc" },
    include: {
      profile: { select: { name: true } },
    },
  });

  return applications as unknown as Application[];
}

export default async function ApplicationsPage() {
  const session = await auth();
  const applications = await getApplications(session!.user!.id!);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)]">APPLICATIONS</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {applications.length} total - saved drafts stay here until you send them
          </p>
        </div>
      </div>

      <KanbanBoard initialApplications={applications} />
    </div>
  );
}
