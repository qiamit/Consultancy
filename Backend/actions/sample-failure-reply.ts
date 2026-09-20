"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@backend/db/client/server";
import { DOCUMENTS_BUCKET } from "@backend/modules/storage/documents";
import { sampleFailureDocumentPath } from "@backend/modules/storage/sample-failure-documents";
import {
  isSampleFailureType,
  type SampleFailureType,
} from "@backend/modules/bis/sample-failure-reply";

const PAGE_PATH = "/dashboard/bis-sample-failure-reply";

export type AddSampleFailureReplyInput = {
  client_id: string;
  is_code_id: string;
  bis_project_id: string | null;
  cm_l_digits: string | null;
  project_kind: string | null;
  sample_failure_type: SampleFailureType;
  sample_code: string;
  sample_qr_code: string;
  notes?: string;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in.", supabase, user: null };
  return { ok: true as const, supabase, user };
}

async function uploadReplyFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  replyId: string,
  kind: "failure-letter" | "offer-letter" | "factory-test-report",
  file: File,
): Promise<{ ok: true; path: string; name: string } | { ok: false; error: string }> {
  if (file.size <= 0) return { ok: false, error: "Empty file." };
  if (file.size > 25 * 1024 * 1024) {
    return { ok: false, error: "File is too large (max 25 MB)." };
  }
  const path = sampleFailureDocumentPath(userId, replyId, kind, file.name);
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, {
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, path, name: file.name };
}

export async function addSampleFailureReply(
  input: AddSampleFailureReplyInput,
  formData?: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const clientId = input.client_id.trim();
  const isCodeId = input.is_code_id.trim();
  const sampleCode = input.sample_code.trim();
  const sampleQr = input.sample_qr_code.trim();
  const failureType = input.sample_failure_type;

  if (!clientId) return { ok: false, error: "Firm name is required." };
  if (!isCodeId) return { ok: false, error: "IS Code is required." };
  if (!isSampleFailureType(failureType)) {
    return { ok: false, error: "Select a valid type of sample failure." };
  }
  if (!sampleCode) return { ok: false, error: "Sample Code is required." };

  const auth = await requireUser();
  if (!auth.ok || !auth.user) return { ok: false, error: auth.error };
  const { supabase, user } = auth;

  const failureFile = formData?.get("failure_letter");
  if (!(failureFile instanceof File) || failureFile.size === 0) {
    return { ok: false, error: "Sample Failure Letter attachment is required." };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("bis_sample_failure_replies")
    .insert({
      client_id: clientId,
      is_code_id: isCodeId,
      bis_project_id: input.bis_project_id,
      cm_l_digits: input.cm_l_digits,
      project_kind: input.project_kind,
      sample_failure_type: failureType,
      sample_code: sampleCode,
      sample_qr_code: sampleQr,
      notes: (input.notes ?? "").trim(),
      created_by: user.id,
      status: "open",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: insertError?.message ?? "Could not create sample failure row." };
  }

  const replyId = (inserted as { id: string }).id;
  const uploaded = await uploadReplyFile(
    supabase,
    user.id,
    replyId,
    "failure-letter",
    failureFile,
  );

  if (!uploaded.ok) {
    await supabase.from("bis_sample_failure_replies").delete().eq("id", replyId);
    return uploaded;
  }

  const { error: updateError } = await supabase
    .from("bis_sample_failure_replies")
    .update({
      failure_letter_path: uploaded.path,
      failure_letter_name: uploaded.name,
    })
    .eq("id", replyId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath(PAGE_PATH);
  revalidatePath("/dashboard");
  return { ok: true, id: replyId };
}

export async function updateSampleFailureReplyDraft(
  replyId: string,
  replyDraft: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = replyId.trim();
  if (!id) return { ok: false, error: "Missing reply id." };

  const auth = await requireUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth;

  const draft = replyDraft.trim();
  const { error } = await supabase
    .from("bis_sample_failure_replies")
    .update({
      reply_draft: draft,
      status: draft ? "drafted" : "open",
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(PAGE_PATH);
  return { ok: true };
}

export async function uploadSampleFailureReplyDocument(
  replyId: string,
  kind: "failure_letter" | "offer_letter" | "factory_test_report",
  formData: FormData,
): Promise<{ ok: true; name: string; path: string } | { ok: false; error: string }> {
  const id = replyId.trim();
  if (!id) return { ok: false, error: "Missing reply id." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a file to upload." };
  }

  const auth = await requireUser();
  if (!auth.ok || !auth.user) return { ok: false, error: auth.error };
  const { supabase, user } = auth;

  const kindMap = {
    failure_letter: "failure-letter",
    offer_letter: "offer-letter",
    factory_test_report: "factory-test-report",
  } as const;

  const uploaded = await uploadReplyFile(supabase, user.id, id, kindMap[kind], file);
  if (!uploaded.ok) return uploaded;

  const patch =
    kind === "failure_letter"
      ? { failure_letter_path: uploaded.path, failure_letter_name: uploaded.name }
      : kind === "offer_letter"
        ? { offer_letter_path: uploaded.path, offer_letter_name: uploaded.name }
        : {
            factory_test_report_path: uploaded.path,
            factory_test_report_name: uploaded.name,
          };

  const { error } = await supabase
    .from("bis_sample_failure_replies")
    .update(patch)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(PAGE_PATH);
  return { ok: true, name: uploaded.name, path: uploaded.path };
}

export async function signSampleFailureDocumentDownload(
  storagePath: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const path = storagePath.trim();
  if (!path) return { ok: false, error: "Missing file path." };

  const auth = await requireUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth;

  const { data: signed, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, 3600);
  if (error || !signed?.signedUrl) {
    return { ok: false, error: error?.message ?? "Could not sign download URL." };
  }
  return { ok: true, url: signed.signedUrl };
}

export async function deleteSampleFailureReply(
  replyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = replyId.trim();
  if (!id) return { ok: false, error: "Missing reply id." };

  const auth = await requireUser();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase } = auth;

  const { data: row } = await supabase
    .from("bis_sample_failure_replies")
    .select(
      "failure_letter_path, offer_letter_path, factory_test_report_path",
    )
    .eq("id", id)
    .maybeSingle();

  const paths = [
    (row as { failure_letter_path?: string | null } | null)?.failure_letter_path,
    (row as { offer_letter_path?: string | null } | null)?.offer_letter_path,
    (row as { factory_test_report_path?: string | null } | null)?.factory_test_report_path,
  ].filter((p): p is string => Boolean(p));

  if (paths.length > 0) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove(paths).catch(() => undefined);
  }

  const { error } = await supabase.from("bis_sample_failure_replies").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(PAGE_PATH);
  return { ok: true };
}
