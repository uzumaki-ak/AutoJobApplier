import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getAuthenticatedUserId } from "@/lib/auth/mobile";
import { deleteUserAttachment, updateUserAttachment } from "@/lib/attachments/store";

const attachmentLogger = logger.child({ module: "api/attachments/[id]" });

const UpdateAttachmentSchema = z
  .object({
    isActive: z.boolean().optional(),
    linkedProfileId: z.string().nullable().optional(),
  })
  .refine((data) => data.isActive !== undefined || data.linkedProfileId !== undefined, {
    message: "No updates provided",
  });

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const parsed = UpdateAttachmentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
    }

    const { id } = await context.params;
    const attachment = await updateUserAttachment(userId, id, parsed.data);
    return NextResponse.json({ success: true, data: attachment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update attachment";
    const status = message === "Attachment not found." ? 404 : 500;
    attachmentLogger.error({ err }, "PATCH /api/attachments/[id] failed");
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const attachment = await deleteUserAttachment(userId, id);
    return NextResponse.json({ success: true, data: attachment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete attachment";
    const status = message === "Attachment not found." ? 404 : 500;
    attachmentLogger.error({ err }, "DELETE /api/attachments/[id] failed");
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
