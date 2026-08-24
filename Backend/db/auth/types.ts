export type AppUser = {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  created_at?: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
};
