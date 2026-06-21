import nodemailer from "nodemailer";
import type { EmailAccountRow } from "@/lib/types/email";

function normalizeAppPassword(pass: string | null | undefined): string {
  return (pass ?? "").replace(/\s+/g, "").trim();
}

export type SendEmailInput = {
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

export async function sendEmail(
  account: EmailAccountRow,
  input: SendEmailInput,
): Promise<{ messageId?: string }> {
  if (!account.smtp_host) throw new Error("SMTP host is not configured.");
  if (!account.password && account.auth_type === "imap") {
    throw new Error("SMTP password is required.");
  }

  const transporter = nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_secure,
    requireTLS: !account.smtp_secure && account.smtp_port === 587,
    auth: {
      user: account.username || account.email_address,
      pass: normalizeAppPassword(account.password),
    },
  });

  const signature = account.signature?.trim();
  const textBody = signature
    ? `${input.text}\n\n--\n${signature}`
    : input.text;
  const htmlBody = input.html
    ? signature
      ? `${input.html}<br/><br/><hr/><p>${signature.replace(/\n/g, "<br/>")}</p>`
      : input.html
    : undefined;

  const info = await transporter.sendMail({
    from: `"${account.display_name}" <${account.email_address}>`,
    to: input.to.join(", "),
    cc: input.cc?.join(", "),
    bcc: input.bcc?.join(", "),
    subject: input.subject,
    text: textBody,
    html: htmlBody,
    inReplyTo: input.inReplyTo,
    references: input.references,
    attachments: input.attachments?.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, "base64"),
      contentType: a.contentType,
    })),
  });

  return { messageId: info.messageId };
}

export async function testSmtpConnection(account: EmailAccountRow): Promise<void> {
  if (!account.smtp_host) throw new Error("SMTP host is not configured.");
  const transporter = nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: account.smtp_secure,
    requireTLS: !account.smtp_secure && account.smtp_port === 587,
    auth: {
      user: account.username || account.email_address,
      pass: normalizeAppPassword(account.password),
    },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 20_000,
  });
  await transporter.verify();
}
