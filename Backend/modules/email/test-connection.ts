import "server-only";

import { testImapConnection } from "@backend/modules/email/imap-client";
import { testSmtpConnection } from "@backend/modules/email/smtp-client";
import type { EmailAccountRow } from "@backend/shared/types/email";

export async function testEmailAccountConnection(account: EmailAccountRow): Promise<void> {
  await testImapConnection(account);
  await testSmtpConnection(account);
}
