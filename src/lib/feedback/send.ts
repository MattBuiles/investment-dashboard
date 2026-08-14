import "server-only";
import { Resend } from "resend";
import {
  getResendApiKey,
  getFeedbackInbox,
  getFeedbackFromAddress,
} from "@/lib/env";

export class FeedbackSendError extends Error {
  override readonly name = "FeedbackSendError";
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
  }
}

export type FeedbackImage = {
  filename: string;
  contentType: string;
  dataBase64: string;
};

export type FeedbackUser = {
  id: string;
  email: string;
  displayName?: string;
};

export type SendFeedbackEmailInput = {
  message: string;
  images: FeedbackImage[];
  pageUrl: string;
  user: FeedbackUser;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeFilename(filename: string): string {
  // Quitar path traversal y caracteres no seguros para MIME headers.
  const base = filename
    .replace(/[\\\/]/g, "_")
    .replace(/\.\.+/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, 120);
  if (base.length === 0) return "attachment";
  if (!/\.[A-Za-z0-9]{1,5}$/.test(base)) {
    return `${base}.png`;
  }
  return base;
}

function buildHtml(opts: SendFeedbackEmailInput, timestamp: string): string {
  const { message, pageUrl, user } = opts;
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const safeDisplayName = user.displayName ? escapeHtml(user.displayName) : "";
  const safePageUrl = escapeHtml(pageUrl);
  const safeEmail = escapeHtml(user.email);
  const safeId = escapeHtml(user.id);
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Feedback</title></head>
<body style="font-family: -apple-system, system-ui, sans-serif; line-height: 1.5; color: #1f2937;">
  <h2 style="margin: 0 0 16px;">Nuevo feedback</h2>
  <table style="border-collapse: collapse; margin-bottom: 16px;">
    <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Usuario</td><td>${safeEmail}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">ID</td><td>${safeId}</td></tr>
    ${safeDisplayName ? `<tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Nombre</td><td>${safeDisplayName}</td></tr>` : ""}
    <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Página</td><td>${safePageUrl}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Fecha</td><td>${escapeHtml(timestamp)}</td></tr>
  </table>
  <h3 style="margin: 16px 0 8px;">Mensaje</h3>
  <div style="white-space: pre-wrap; background: #f9fafb; padding: 12px; border-radius: 8px;">${safeMessage}</div>
</body>
</html>`;
}

function buildText(opts: SendFeedbackEmailInput, timestamp: string): string {
  const { message, pageUrl, user } = opts;
  return [
    `Nuevo feedback de ${user.email}`,
    `ID: ${user.id}`,
    user.displayName ? `Nombre: ${user.displayName}` : null,
    `Página: ${pageUrl}`,
    `Fecha: ${timestamp}`,
    "",
    "Mensaje:",
    message,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildAttachments(images: FeedbackImage[]) {
  return images.map((img, i) => ({
    filename: sanitizeFilename(img.filename || `image-${i + 1}.png`),
    content: img.dataBase64,
  }));
}

export async function sendFeedbackEmail(
  input: SendFeedbackEmailInput
): Promise<{ id: string }> {
  const apiKey = getResendApiKey();
  const to = getFeedbackInbox();
  const resend = new Resend(apiKey);

  const timestamp = new Date().toISOString();
  try {
    const result = await resend.emails.send({
      from: getFeedbackFromAddress(),
      to: [to],
      replyTo: input.user.email,
      subject: `[Feedback · investment-dashboard] ${input.user.email}`,
      html: buildHtml(input, timestamp),
      text: buildText(input, timestamp),
      attachments: buildAttachments(input.images),
    });

    if (result.error) {
      throw new FeedbackSendError(
        `Resend error: ${result.error.message ?? "unknown"}`,
        result.error
      );
    }
    if (!result.data?.id) {
      throw new FeedbackSendError("Resend returned no message id");
    }
    return { id: result.data.id };
  } catch (err) {
    if (err instanceof FeedbackSendError) throw err;
    throw new FeedbackSendError(
      err instanceof Error ? err.message : "Failed to send feedback email",
      err
    );
  }
}
