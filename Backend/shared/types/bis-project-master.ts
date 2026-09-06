/** Attached files for a BIS project (`project_documents` where `bis_project_id` is set). */
export type BisProjectDocumentRow = {
  id: string;
  bis_project_id: string;
  storage_path: string;
  file_name: string | null;
  created_at: string;
};

/** Row from `bis_projects` (+ optional joins for list UI). */
export type BisProjectMasterRow = {
  id: string;
  client_id: string | null;
  project_kind: string;
  title: string;
  status: string;
  license_number: string | null;
  start_date: string | null;
  target_date: string | null;
  notes: string | null;
  is_code_id: string | null;
  cm_l_digits: string | null;
  license_validity_date: string | null;
  case_handled_by: string | null;
  case_referred_by: string | null;
  billing_amount: number | null;
  billing_frequency: string | null;
  portal_user_id: string | null;
  portal_password: string | null;
  /** True when QE actively manages this licence (Our BIS License portfolio). */
  is_qe_managed?: boolean | null;
  created_at: string;
  updated_at?: string;
  /** Joined in page loader. */
  clients?: { name: string; company_name: string | null } | null;
  is_codes?: {
    is_number: string;
    is_code_title: string;
    revision_year?: number | null;
  } | null;
  documents?: BisProjectDocumentRow[];
};
