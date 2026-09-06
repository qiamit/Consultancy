import { EmailWorkspace } from "@/components/modules/email/email-workspace";
import { fetchEmailAccounts } from "@backend/actions/email-accounts";

export default async function EmailPage() {
  const { accounts, error } = await fetchEmailAccounts();
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <EmailWorkspace initialAccounts={accounts} setupError={error} />
    </div>
  );
}
