export type TestParameterIsCodeJoin = {
  is_number: string;
  revision_year: number;
};

export type TestParameterMasterRow = {
  id: string;
  is_code_id: string;
  test_name: string;
  clause_no: string;
  test_method: string;
  unit: string;
  specified_value: string;
  created_at: string;
  /** Joined in the page loader (not a DB column). */
  is_codes?: TestParameterIsCodeJoin | null;
};
