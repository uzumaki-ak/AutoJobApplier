import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const ATTACHMENTS_ROOT = path.join(process.cwd(), "storage", "user-attachments");
const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_USER = 5;

export type StoredAttachment = {
  id: string;
  userId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  isActive: boolean;
  linkedProfileId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AttachmentRecord = Omit<StoredAttachment, "storagePath" | "userId">;

function getUserDir(userId: string) {
  return path.join(ATTACHMENTS_ROOT, userId);
}

function getManifestPath(userId: string) {
  return path.join(getUserDir(userId), "manifest.json");
}

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim();
  const fallback = "attachment.pdf";
  const safe = (trimmed || fallback).replace(/[^A-Za-z0-9._ -]/g, "_");
  return safe.length > 120 ? safe.slice(0, 120) : safe;
}

function toAttachmentRecord(attachment: StoredAttachment): AttachmentRecord {
  const { storagePath: _storagePath, userId: _userId, ...rest } = attachment;
  return rest;
}

async function ensureUserDirectory(userId: string) {
  await mkdir(getUserDir(userId), { recursive: true });
}

async function readManifest(userId: string): Promise<StoredAttachment[]> {
  await ensureUserDirectory(userId);
  const manifestPath = getManifestPath(userId);

  try {
    const content = await readFile(manifestPath, "utf8");
    const parsed = JSON.parse(content) as StoredAttachment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("ENOENT")) {
      return [];
    }
    throw error;
  }
}

async function writeManifest(userId: string, attachments: StoredAttachment[]) {
  await ensureUserDirectory(userId);
  await writeFile(getManifestPath(userId), JSON.stringify(attachments, null, 2), "utf8");
}

export async function listUserAttachments(userId: string): Promise<AttachmentRecord[]> {
  const attachments = await readManifest(userId);
  return attachments
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toAttachmentRecord);
}

export async function loadActiveUserAttachments(userId: string): Promise<Array<AttachmentRecord & { content: Buffer }>> {
  const attachments = await readManifest(userId);
  const activeAttachments = attachments.filter((attachment) => attachment.isActive);

  const withContent = await Promise.all(
    activeAttachments.map(async (attachment) => ({
      ...toAttachmentRecord(attachment),
      content: await readFile(attachment.storagePath),
    }))
  );

  return withContent;
}

export async function loadUserAttachmentById(
  userId: string,
  attachmentId: string
): Promise<(AttachmentRecord & { content: Buffer }) | null> {
  const attachments = await readManifest(userId);
  const attachment = attachments.find((item) => item.id === attachmentId);

  if (!attachment) {
    return null;
  }

  return {
    ...toAttachmentRecord(attachment),
    content: await readFile(attachment.storagePath),
  };
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

  const existing = await readManifest(input.userId);
  if (existing.length >= MAX_ATTACHMENTS_PER_USER) {
    throw new Error(`You can store up to ${MAX_ATTACHMENTS_PER_USER} attachments.`);
  }

  await ensureUserDirectory(input.userId);
  const id = randomUUID();
  const safeFileName = sanitizeFileName(input.fileName);
  const storagePath = path.join(getUserDir(input.userId), `${id}-${safeFileName}`);
  const now = new Date().toISOString();

  await writeFile(storagePath, input.bytes);

  const attachment: StoredAttachment = {
    id,
    userId: input.userId,
    fileName: safeFileName,
    mimeType: input.mimeType,
    sizeBytes: input.bytes.byteLength,
    storagePath,
    isActive: input.isActive ?? true,
    linkedProfileId: input.linkedProfileId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const next = [attachment, ...existing];
  await writeManifest(input.userId, next);
  return toAttachmentRecord(attachment);
}

export async function updateUserAttachment(
  userId: string,
  attachmentId: string,
  updates: { isActive?: boolean; linkedProfileId?: string | null }
): Promise<AttachmentRecord> {
  const existing = await readManifest(userId);
  const index = existing.findIndex((attachment) => attachment.id === attachmentId);

  if (index === -1) {
    throw new Error("Attachment not found.");
  }

  const current = existing[index];
  const nextAttachment: StoredAttachment = {
    ...current,
    isActive: typeof updates.isActive === "boolean" ? updates.isActive : current.isActive,
    linkedProfileId:
      updates.linkedProfileId === undefined ? current.linkedProfileId ?? null : updates.linkedProfileId,
    updatedAt: new Date().toISOString(),
  };

  existing[index] = nextAttachment;
  await writeManifest(userId, existing);
  return toAttachmentRecord(nextAttachment);
}

export async function deleteUserAttachment(userId: string, attachmentId: string): Promise<AttachmentRecord> {
  const existing = await readManifest(userId);
  const target = existing.find((attachment) => attachment.id === attachmentId);

  if (!target) {
    throw new Error("Attachment not found.");
  }

  const next = existing.filter((attachment) => attachment.id !== attachmentId);
  await writeManifest(userId, next);

  try {
    await unlink(target.storagePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("ENOENT")) {
      throw error;
    }
  }

  return toAttachmentRecord(target);
}

export async function clearUserAttachmentStorage(userId: string) {
  await rm(getUserDir(userId), { recursive: true, force: true });
}

export async function getAttachmentStorageUsage(userId: string) {
  const attachments = await readManifest(userId);
  let totalBytes = 0;

  for (const attachment of attachments) {
    try {
      const fileStat = await stat(attachment.storagePath);
      totalBytes += fileStat.size;
    } catch {
      totalBytes += attachment.sizeBytes;
    }
  }

  return {
    totalBytes,
    count: attachments.length,
  };
}
