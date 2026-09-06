import "server-only";

import { testImapConnection } from "@backend/modules/email/imap-client";
import type { EmailAccountRow } from "@backend/shared/types/email";

export async function testEmailAccountConnection(account: EmailAccountRow): Promise<void> {
  // Inbox sync only needs IMAP. SMTP/Resend is validated separately when sending.
  await testImapConnection(account);
}
