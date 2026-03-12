// [F10] src/app/(dashboard)/applications/[id]/page.tsx — Application detail

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { formatDate, STATUS_COLORS, STATUS_LABELS, scoreColor, buildGmailComposeUrl } from "@/lib/utils";
import Link from "next/link";
import { ApplicationEmailActions } from "@/components/applications/application-email-actions";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const app = await db.application.findFirst({
    where: { id, userId: session!.user!.id! },
    include: {
      profile: true,
      emails: { orderBy: { sentAt: "desc" } },
      statusHistory: { orderBy: { changedAt: "desc" } },
    },
  });

  if (!app) notFound();

  const colors = STATUS_COLORS[app.status];
  const dateLabel = app.status === "SAVED" ? "Saved" : "Applied";
  const gmailUrl = app.hrEmail && app.mailSubject && app.mailBody
    ? buildGmailComposeUrl({ to: app.hrEmail, subject: app.mailSubject, body: app.mailBody })
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/applications" className="text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] mb-2 inline-block">
            ← Back to applications
          </Link>
          <h1 className="font-display text-2xl font-bold text-[var(--color-foreground)]">{app.company}</h1>
          <p className="text-[var(--color-muted-foreground)]">{app.role}</p>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-xl ${colors.bg} ${colors.text} font-medium`}>
          {STATUS_LABELS[app.status]}
        </span>
      </div>

      {/* Main info */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-[var(--color-muted-foreground)] text-xs mb-1">{dateLabel}</p>
            <p className="text-[var(--color-foreground)]">{formatDate(app.appliedAt)}</p>
          </div>
          {app.hrEmail && (
            <div>
              <p className="text-[var(--color-muted-foreground)] text-xs mb-1">HR Email</p>
              <a href={`mailto:${app.hrEmail}`} className="text-[var(--color-primary)] hover:underline break-all">{app.hrEmail}</a>
            </div>
          )}
          {app.matchScore != null && (
            <div>
              <p className="text-[var(--color-muted-foreground)] text-xs mb-1">Match Score</p>
              <p className={`font-display font-bold ${scoreColor(app.matchScore)}`}>{app.matchScore}%</p>
            </div>
          )}
          {app.profile && (
            <div>
              <p className="text-[var(--color-muted-foreground)] text-xs mb-1">Profile Used</p>
              <p className="text-[var(--color-foreground)]">{app.profile.name}</p>
            </div>
          )}
        </div>

        {app.matchReason && (
          <div className="pt-3 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Match Reason</p>
            <p className="text-sm text-[var(--color-foreground)]">{app.matchReason}</p>
          </div>
        )}

        {app.notes && (
          <div className="pt-3 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Notes</p>
            <p className="text-sm text-[var(--color-foreground)]">{app.notes}</p>
          </div>
        )}
      </div>

      {/* Email draft */}
      {app.mailBody && (
        <div className="glass rounded-2xl p-6 space-y-3">
          <h2 className="font-display text-sm font-semibold text-[var(--color-foreground)]">
            {app.status === "SAVED" ? "TRACKED DRAFT" : "EMAIL DRAFT"}
          </h2>
          {app.mailSubject && <p className="text-xs text-[var(--color-muted-foreground)]">Subject: {app.mailSubject}</p>}
          <pre className="text-sm text-[var(--color-foreground)] whitespace-pre-wrap font-sans bg-[var(--color-muted)] p-4 rounded-xl">
            {app.mailBody}
          </pre>
          <div className="flex gap-3">
            <ApplicationEmailActions
              applicationId={app.id}
              company={app.company}
              role={app.role}
              hrEmail={app.hrEmail ?? ""}
              jobDescription={app.jobDescription ?? ""}
              subject={app.mailSubject ?? ""}
              body={app.mailBody}
              profileId={app.profileId ?? ""}
              profileName={app.profile?.name ?? "Saved Profile"}
            />
            {gmailUrl && (
              <a
                href={gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-sm font-medium hover:opacity-90"
              >
                Open in Gmail
              </a>
            )}
          </div>
        </div>
      )}

      {/* Status history */}
      {app.statusHistory.length > 0 && (
        <div className="glass rounded-2xl p-6 space-y-3">
          <h2 className="font-display text-sm font-semibold text-[var(--color-foreground)]">STATUS HISTORY</h2>
          <div className="space-y-2">
            {app.statusHistory.map((h) => (
              <div key={h.id} className="flex items-center gap-3 text-sm">
                <span className="text-[var(--color-muted-foreground)] text-xs">{formatDate(h.changedAt)}</span>
                <span className="text-[var(--color-muted-foreground)]">{STATUS_LABELS[h.fromStatus]}</span>
                <span className="text-[var(--color-muted-foreground)]">→</span>
                <span className="text-[var(--color-foreground)]">{STATUS_LABELS[h.toStatus]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
