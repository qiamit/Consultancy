import { CompanySettingsTabs } from "@/components/dashboard/company-settings-tabs";
import { listCompanyNotesTemplates } from "@/lib/data/company-notes-templates";
import { listCompanyScopeOfWork } from "@/lib/data/company-scope-of-work";
import { listCompanyTerms } from "@/lib/data/company-terms";
import { DOCUMENTS_BUCKET } from "@/lib/storage/documents";
import { createClient } from "@/lib/supabase/server";

async function signedImageUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path?.trim()) return null;
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path.trim(), 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function companySettingsPageError(err: string | undefined): string | null {
  if (!err) return null;
  if (err === "db") return "Could not save settings. Try again.";
  if (err === "upload") {
    return "One or more image uploads failed. Check file size and format.";
  }
  if (err.endsWith("_validate")) {
    return "Each template needs a valid link code and display name. Use lowercase letters, numbers, and underscores only for the code.";
  }
  if (err.endsWith("_duplicate")) {
    return "That link code is already in use. Choose another code.";
  }
  if (err.endsWith("_not_found")) {
    return "That template no longer exists. Refresh the page.";
  }
  if (err.endsWith("_default_delete")) {
    return "The default template cannot be deleted.";
  }
  if (err.endsWith("_db")) {
    return "Could not save templates. Try again.";
  }
  return null;
}

export default async function CompanySettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const err = firstSearchParam(sp, "error");
  const errMsg = companySettingsPageError(err);

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  const r = row as Record<string, string | null | undefined> | null;

  const [
    logoUrl,
    letterUpperUrl,
    letterLowerUrl,
    sealUrl,
    upiQrUrl,
    chequeUrl,
    termsRows,
    scopeRows,
    notesRows,
  ] = await Promise.all([
    signedImageUrl(supabase, r?.logo_path),
    signedImageUrl(supabase, r?.letterhead_upper_path),
    signedImageUrl(supabase, r?.letterhead_lower_path),
    signedImageUrl(supabase, r?.seal_sign_image_path),
    signedImageUrl(supabase, r?.bank_upi_qr_path),
    signedImageUrl(supabase, r?.bank_cheque_image_path),
    listCompanyTerms(),
    listCompanyScopeOfWork(),
    listCompanyNotesTemplates(),
  ]);

  return (
    <CompanySettingsTabs
      errMsg={errMsg}
      r={r}
      logoUrl={logoUrl}
      letterUpperUrl={letterUpperUrl}
      letterLowerUrl={letterLowerUrl}
      sealUrl={sealUrl}
      upiQrUrl={upiQrUrl}
      chequeUrl={chequeUrl}
      termsRows={termsRows}
      scopeRows={scopeRows}
      notesRows={notesRows}
    />
  );
}
