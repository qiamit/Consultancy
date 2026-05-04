export type ClientMasterRow = {
  id: string;
  name: string;
  company_name: string | null;
  gst_number: string | null;
  company_type: string | null;
  company_scale: string | null;
  company_status: string | null;
  contact_person_name: string | null;
  email: string | null;
  /** E.164-style calling code (e.g. +91). */
  phone_country_code: string | null;
  /** National mobile digits only (no country code). */
  phone: string | null;
  address: string | null;
  pin_code: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  opening_balance: number | null;
  balance_type: string | null;
  payment_term: string | null;
  notes: string | null;
  created_at: string;
};
