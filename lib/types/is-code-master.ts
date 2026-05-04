export type IsCodeFileRow = {
  id: string;
  is_code_id: string;
  storage_path: string;
  file_name: string | null;
  created_at?: string;
};

export type IsCodeMasterRow = {
  id: string;
  is_number: string;
  revision_year: number;
  reaffirmation_year: number | null;
  amendment_number: string | null;
  aspect_of_is: string;
  product_manual_number: string | null;
  is_code_title: string;
  testing_charges: number | null;
  unit_of_is: string;
  mmf_large_scale: number | null;
  mmf_medium_scale: number | null;
  mmf_small_scale: number | null;
  mmf_micro_scale: number | null;
  slab_1_quantity: string | null;
  slab_1_rate: number | null;
  slab_2_quantity: string | null;
  slab_2_rate: number | null;
  slab_3_quantity: string | null;
  slab_3_rate: number | null;
  created_at: string;
  /** Joined in the page loader for the UI (not a DB column). */
  files?: IsCodeFileRow[];
};
