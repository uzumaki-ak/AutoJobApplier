import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { getAuthenticatedUserId } from "@/lib/auth/mobile";

const applicationLogger = logger.child({ module: "api/applications/[id]" });

const StatusSchema = z.enum(["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "NO_RESPONSE"]);

const UpdateSchema = z.object({
  status: StatusSchema.optional(),
  hrEmail: z.string().optional(),
  notes: z.string().optional(),
  mailSubject: z.string().optional(),
  mailBody: z.string().optional(),
  jobDescription: z.string().optional(),
});

function normalizeOptionalString(value: string | undefined) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const application = await db.application.findFirst({
      where: { id, userId },
      include: {
        profile: { select: { name: true } },
        emails: { orderBy: { sentAt: "desc" } },
        statusHistory: { orderBy: { changedAt: "desc" } },
      },
    });

    if (!application) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: application });
  } catch (err) {
    applicationLogger.error({ err }, "GET /api/applications/[id] failed");
    return NextResponse.json({ success: false, error: "Failed to fetch application" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const parsed = UpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
    }

    const { id } = await params;
    const existing = await db.application.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }

    const nextStatus = parsed.data.status;
    const nextHrEmail = normalizeOptionalString(parsed.data.hrEmail);
    const nextNotes = normalizeOptionalString(parsed.data.notes);
    const nextMailSubject = normalizeOptionalString(parsed.data.mailSubject);
    const nextMailBody = normalizeOptionalString(parsed.data.mailBody);
    const nextJobDescription = normalizeOptionalString(parsed.data.jobDescription);

    await db.$transaction(async (tx) => {
      await tx.application.update({
        where: { id },
        data: {
          status: nextStatus ?? existing.status,
          hrEmail: nextHrEmail === undefined ? existing.hrEmail : nextHrEmail,
          notes: nextNotes === undefined ? existing.notes : nextNotes,
          mailSubject: nextMailSubject === undefined ? existing.mailSubject : nextMailSubject,
          mailBody: nextMailBody === undefined ? existing.mailBody : nextMailBody,
          jobDescription: nextJobDescription === undefined ? existing.jobDescription : nextJobDescription,
        },
      });

      if (nextStatus && nextStatus !== existing.status) {
        await tx.statusHistory.create({
          data: {
            applicationId: id,
            fromStatus: existing.status,
            toStatus: nextStatus,
          },
        });
      }
    });

    const updated = await db.application.findFirst({
      where: { id, userId },
      include: {
        profile: { select: { name: true } },
        statusHistory: { orderBy: { changedAt: "desc" } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    applicationLogger.error({ err }, "PUT /api/applications/[id] failed");
    return NextResponse.json({ success: false, error: "Failed to update application" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.application.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
    }

    await db.application.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    applicationLogger.error({ err }, "DELETE /api/applications/[id] failed");
    return NextResponse.json({ success: false, error: "Failed to delete application" }, { status: 500 });
  }
}
