// [F64] src/lib/gmail/client.ts — Gmail OAuth2 client
// Handles token management and sending emails via Gmail API
// User must connect Gmail via /settings before this works

import { google } from "googleapis";
import { db } from "@/lib/db/prisma";
import { gmailLogger } from "@/lib/logger";
import { loadActiveUserAttachments, loadUserAttachmentById } from "@/lib/attachments/store";

type GmailAttachment = {
  fileName: string;
  mimeType: string;
  content: Buffer;
};

function isRevokedGmailTokenError(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return false;
  }

  const candidate = err as {
    message?: string;
    response?: {
      data?: {
        error?: string;
        error_description?: string;
      };
    };
  };

  const message = candidate.message ?? "";
  const errorCode = candidate.response?.data?.error ?? "";
  const description = candidate.response?.data?.error_description ?? "";

  return (
    errorCode === "invalid_grant" ||
    message.includes("invalid_grant") ||
    /expired or revoked/i.test(description)
  );
}

async function clearStoredGmailTokens(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: {
      gmailAccessToken: null,
      gmailRefreshToken: null,
      gmailTokenExpiry: null,
    },
  });
}

/** Create an authenticated Gmail OAuth2 client for a user */
export async function getGmailClient(userId: string) {
  // Fetch stored Gmail tokens
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      gmailAccessToken: true,
      gmailRefreshToken: true,
      gmailTokenExpiry: true,
    },
  });

  if (!user?.gmailRefreshToken) {
    throw new Error("Gmail not connected. Please connect Gmail in Settings.");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
    process.env.GMAIL_REDIRECT_URI!
  );

  // Set tokens
  oauth2Client.setCredentials({
    access_token: user.gmailAccessToken,
    refresh_token: user.gmailRefreshToken,
    expiry_date: user.gmailTokenExpiry?.getTime(),
  });

  // Auto-refresh expired token and persist new one
  oauth2Client.on("tokens", async (tokens) => {
    gmailLogger.info({ userId }, "Gmail token refreshed");
    await db.user.update({
      where: { id: userId },
      data: {
        gmailAccessToken: tokens.access_token ?? undefined,
        gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

/** Build a base64url-encoded RFC 2822 email */
function buildRawEmail(opts: {
  to: string;
  from: string;
  subject: string;
  body: string;
  attachments?: GmailAttachment[];
}): string {
  if (opts.attachments && opts.attachments.length > 0) {
    const boundary = `mixed_${Date.now().toString(36)}`;
    const lines = [
      `To: ${opts.to}`,
      `From: ${opts.from}`,
      `Subject: ${opts.subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      opts.body,
      "",
    ];

    for (const attachment of opts.attachments) {
      const base64 = attachment.content.toString("base64");
      const chunks = base64.match(/.{1,76}/g) ?? [base64];
      const safeFileName = attachment.fileName.replace(/"/g, "'");

      lines.push(
        `--${boundary}`,
        `Content-Type: ${attachment.mimeType}; name="${safeFileName}"`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${safeFileName}"`,
        "",
        ...chunks,
        ""
      );
    }

    lines.push(`--${boundary}--`);

    return Buffer.from(lines.join("\r\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  const email = [
    `To: ${opts.to}`,
    `From: ${opts.from}`,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    opts.body,
  ].join("\r\n");

  return Buffer.from(email)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Send an email via Gmail API on behalf of a user */
export async function sendGmailEmail(opts: {
  userId: string;
  to: string;
  subject: string;
  body: string;
  attachmentId?: string | null;
}): Promise<{ messageId: string; threadId: string }> {
  try {
    const gmail = await getGmailClient(opts.userId);
    const selectedAttachmentId = typeof opts.attachmentId === "string" ? opts.attachmentId : null;
    const attachments = selectedAttachmentId
      ? await (async () => {
          const attachment = await loadUserAttachmentById(opts.userId, selectedAttachmentId);
          return attachment ? [attachment] : [];
        })()
      : await loadActiveUserAttachments(opts.userId);

    const profile = await gmail.users.getProfile({ userId: "me" });
    const fromEmail = profile.data.emailAddress!;

    const raw = buildRawEmail({
      to: opts.to,
      from: fromEmail,
      subject: opts.subject,
      body: opts.body,
      attachments,
    });

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    gmailLogger.info(
      {
        userId: opts.userId,
        to: opts.to,
        messageId: response.data.id,
        attachmentCount: attachments.length,
        attachmentId: opts.attachmentId ?? null,
      },
      "Email sent via Gmail API"
    );

    return {
      messageId: response.data.id!,
      threadId: response.data.threadId!,
    };
  } catch (err) {
    if (isRevokedGmailTokenError(err)) {
      await clearStoredGmailTokens(opts.userId);
      gmailLogger.warn({ userId: opts.userId }, "Stored Gmail token expired or revoked; cleared tokens");
      throw new Error("Gmail authorization expired. Reconnect Gmail in Settings.");
    }

    throw err;
  }
}

/** Generate Gmail OAuth URL for user to authorize */
export function getGmailAuthUrl(): string {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
    process.env.GMAIL_REDIRECT_URI!
  );

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // Always get refresh token
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
  });
}

/** Exchange auth code for tokens and store in DB */
export async function exchangeGmailCode(userId: string, code: string): Promise<void> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID!,
    process.env.GMAIL_CLIENT_SECRET!,
    process.env.GMAIL_REDIRECT_URI!
  );

  const { tokens } = await oauth2Client.getToken(code);

  await db.user.update({
    where: { id: userId },
    data: {
      gmailAccessToken: tokens.access_token,
      gmailRefreshToken: tokens.refresh_token ?? undefined,
      gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    },
  });

  gmailLogger.info({ userId }, "Gmail tokens stored successfully");
}
