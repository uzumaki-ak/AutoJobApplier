import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getAuthenticatedUserId } from "@/lib/auth/mobile";
import { listUserAttachments, saveUserAttachment } from "@/lib/attachments/store";

const attachmentLogger = logger.child({ module: "api/attachments" });

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const attachments = await listUserAttachments(userId);
    return NextResponse.json({ success: true, data: attachments });
  } catch (err) {
    attachmentLogger.error({ err }, "GET /api/attachments failed");
    return NextResponse.json({ success: false, error: "Failed to load attachments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const isActive = form.get("isActive");
    const linkedProfileId = form.get("linkedProfileId");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "PDF file is required" }, { status: 400 });
    }

    const attachment = await saveUserAttachment({
      userId,
      fileName: file.name,
      mimeType: file.type || "application/pdf",
      bytes: Buffer.from(await file.arrayBuffer()),
      isActive: typeof isActive === "string" ? isActive === "true" : true,
      linkedProfileId: typeof linkedProfileId === "string" && linkedProfileId.trim() ? linkedProfileId.trim() : null,
    });

    return NextResponse.json({ success: true, data: attachment }, { status: 201 });
  } catch (err) {
    attachmentLogger.error({ err }, "POST /api/attachments failed");
    const message = err instanceof Error ? err.message : "Attachment upload failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
