import "server-only";

import { testImapConnection } from "@/lib/email/imap-client";
import { testSmtpConnection } from "@/lib/email/smtp-client";
import type { EmailAccountRow } from "@/lib/types/email";

export async function testEmailAccountConnection(account: EmailAccountRow): Promise<void> {
  await testImapConnection(account);
  await testSmtpConnection(account);
}
