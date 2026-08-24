import { EmailWorkspace } from "@/components/modules/email/email-workspace";
import { fetchEmailAccounts } from "@backend/actions/email-accounts";
import {
  getDefaultResendFrom,
  isResendConfigured,
  resendAllowedDomains,
} from "@backend/modules/email/resend";

export default async function EmailPage() {
  const { accounts, error } = await fetchEmailAccounts();
  const resendReady = isResendConfigured();
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {resendReady ? (
        <div className="shrink-0 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
          Outbound email via Resend is active for{" "}
          <span className="font-medium">
            @{resendAllowedDomains().join(", @")}
          </span>{" "}
          (default from {getDefaultResendFrom()}). Inbox sync still uses Zoho/IMAP.
        </div>
      ) : (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          Resend is not configured. Set{" "}
          <code className="font-mono">RESEND_API_KEY</code> to send from
          @qengineering.in.
        </div>
      )}
      <EmailWorkspace initialAccounts={accounts} setupError={error} />
    </div>
  );
}
