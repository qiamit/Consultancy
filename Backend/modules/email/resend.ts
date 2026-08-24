import "server-only";
import { Resend } from "resend";
import type { EmailAccountRow } from "@backend/shared/types/email";

export type ResendSendInput = {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: {
    filename: string;
    contentType: string;
    content: string;
  }[];
};

export function getResendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY?.trim();
  return key || null;
}

export function isResendConfigured(): boolean {
  return Boolean(getResendApiKey());
}

/** Domains allowed to send via Resend (comma-separated). Default: qengineering.in */
export function resendAllowedDomains(): string[] {
  const raw =
    process.env.RESEND_ALLOWED_DOMAINS?.trim() ||
    process.env.RESEND_FROM_DOMAIN?.trim() ||
    "qengineering.in";
  return raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function getDefaultResendFrom(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.SUPER_ADMIN_EMAIL?.trim() ||
    "info@qengineering.in"
  );
}

export function emailDomainOf(address: string): string {
  return address.trim().toLowerCase().split("@")[1] ?? "";
}

export function canSendViaResend(fromAddress: string): boolean {
  if (!isResendConfigured()) return false;
  const domain = emailDomainOf(fromAddress);
  return resendAllowedDomains().includes(domain);
}

function getResendClient(): Resend {
  const key = getResendApiKey();
  if (!key) throw new Error("RESEND_API_KEY is not configured.");
  return new Resend(key);
}

export async function verifyResendApiKey(): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.domains.list();
  if (error) throw new Error(error.message);
}

export async function sendEmailViaResend(
  account: Pick<EmailAccountRow, "display_name" | "email_address" | "signature">,
  input: ResendSendInput,
): Promise<{ messageId?: string }> {
  if (!canSendViaResend(account.email_address)) {
    throw new Error(
      `Resend is not configured for ${account.email_address}. Verify domain on Resend and RESEND_API_KEY.`,
    );
  }

  const signature = account.signature?.trim();
  const textBody = signature
    ? `${input.text}\n\n--\n${signature}`
    : input.text;
  const htmlBody = input.html
    ? signature
      ? `${input.html}<br/><br/><hr/><p>${signature.replace(/\n/g, "<br/>")}</p>`
      : input.html
    : undefined;

  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: `"${account.display_name}" <${account.email_address}>`,
    to: input.to,
    cc: input.cc?.length ? input.cc : undefined,
    bcc: input.bcc?.length ? input.bcc : undefined,
    subject: input.subject,
    text: textBody,
    html: htmlBody,
    headers: {
      ...(input.inReplyTo ? { "In-Reply-To": input.inReplyTo } : {}),
      ...(input.references ? { References: input.references } : {}),
    },
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, "base64"),
      contentType: a.contentType,
    })),
  });

  if (error) throw new Error(error.message);
  return { messageId: data?.id };
}

/** System / app transactional mail (no mailbox account required). */
export async function sendSystemEmail(input: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  from?: string;
}): Promise<{ messageId?: string }> {
  const from = input.from?.trim() || getDefaultResendFrom();
  if (!canSendViaResend(from)) {
    throw new Error(
      "Resend is not configured. Set RESEND_API_KEY and verify qengineering.in on Resend.",
    );
  }
  return sendEmailViaResend(
    {
      display_name: process.env.RESEND_FROM_NAME?.trim() || "Q Engineering",
      email_address: from,
      signature: null,
    },
    {
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    },
  );
}
