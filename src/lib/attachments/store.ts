import { db } from "@/lib/db/prisma";

const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_USER = 5;

export type AttachmentRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isActive: boolean;
  linkedProfileId?: string | null;
  createdAt: string;
  updatedAt: string;
};

type AttachmentRow = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isActive: boolean;
  linkedProfileId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type AttachmentWithContent = AttachmentRow & { content: Buffer };

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim();
  const fallback = "attachment.pdf";
  const safe = (trimmed || fallback).replace(/[^A-Za-z0-9._ -]/g, "_");
  return safe.length > 120 ? safe.slice(0, 120) : safe;
}

function toAttachmentRecord(attachment: AttachmentRow): AttachmentRecord {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    isActive: attachment.isActive,
    linkedProfileId: attachment.linkedProfileId ?? null,
    createdAt: attachment.createdAt.toISOString(),
    updatedAt: attachment.updatedAt.toISOString(),
  };
}

function withContent(attachment: AttachmentWithContent) {
  return {
    ...toAttachmentRecord(attachment),
    content: attachment.content,
  };
}

export async function listUserAttachments(userId: string): Promise<AttachmentRecord[]> {
  const attachments = await db.attachment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      isActive: true,
      linkedProfileId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return attachments.map(toAttachmentRecord);
}

export async function loadActiveUserAttachments(
  userId: string
): Promise<Array<AttachmentRecord & { content: Buffer }>> {
  const attachments = await db.attachment.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      isActive: true,
      linkedProfileId: true,
      createdAt: true,
      updatedAt: true,
      content: true,
    },
  });

  return attachments.map(withContent);
}

export async function loadUserAttachmentById(
  userId: string,
  attachmentId: string
): Promise<(AttachmentRecord & { content: Buffer }) | null> {
  const attachment = await db.attachment.findFirst({
    where: { userId, id: attachmentId },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      isActive: true,
      linkedProfileId: true,
      createdAt: true,
      updatedAt: true,
      content: true,
    },
  });

  return attachment ? withContent(attachment) : null;
}

export async function saveUserAttachment(input: {
  userId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  isActive?: boolean;
  linkedProfileId?: string | null;
}): Promise<AttachmentRecord> {
  if (input.mimeType !== "application/pdf") {
    throw new Error("Only PDF attachments are supported.");
  }

  if (input.bytes.byteLength === 0) {
    throw new Error("Attachment file is empty.");
  }

  if (input.bytes.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error("Attachment file is too large (max 6MB).");
  }

  const existingCount = await db.attachment.count({ where: { userId: input.userId } });
  if (existingCount >= MAX_ATTACHMENTS_PER_USER) {
    throw new Error(`You can store up to ${MAX_ATTACHMENTS_PER_USER} attachments.`);
  }

  const safeFileName = sanitizeFileName(input.fileName);
  const attachment = await db.attachment.create({
    data: {
      userId: input.userId,
      fileName: safeFileName,
      mimeType: input.mimeType,
      sizeBytes: input.bytes.byteLength,
      content: input.bytes,
      isActive: input.isActive ?? true,
      linkedProfileId: input.linkedProfileId ?? null,
    },
  });

  return toAttachmentRecord(attachment);
}

export async function updateUserAttachment(
  userId: string,
  attachmentId: string,
  updates: { isActive?: boolean; linkedProfileId?: string | null }
): Promise<AttachmentRecord> {
  const existing = await db.attachment.findFirst({
    where: { userId, id: attachmentId },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      isActive: true,
      linkedProfileId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!existing) {
    throw new Error("Attachment not found.");
  }

  const updated = await db.attachment.update({
    where: { id: attachmentId },
    data: {
      isActive: typeof updates.isActive === "boolean" ? updates.isActive : existing.isActive,
      linkedProfileId:
        updates.linkedProfileId === undefined ? existing.linkedProfileId ?? null : updates.linkedProfileId,
    },
  });

  return toAttachmentRecord(updated);
}

export async function deleteUserAttachment(userId: string, attachmentId: string): Promise<AttachmentRecord> {
  const target = await db.attachment.findFirst({
    where: { userId, id: attachmentId },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      isActive: true,
      linkedProfileId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!target) {
    throw new Error("Attachment not found.");
  }

  await db.attachment.delete({ where: { id: attachmentId } });
  return toAttachmentRecord(target);
}

export async function clearUserAttachmentStorage(userId: string) {
  await db.attachment.deleteMany({ where: { userId } });
}

export async function getAttachmentStorageUsage(userId: string) {
  const aggregated = await db.attachment.aggregate({
    where: { userId },
    _sum: { sizeBytes: true },
    _count: { _all: true },
  });

  return {
    totalBytes: aggregated._sum.sizeBytes ?? 0,
    count: aggregated._count._all ?? 0,
  };
}
