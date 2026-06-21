export type EmailProvider =
  | "gmail"
  | "outlook"
  | "hotmail"
  | "zoho"
  | "yahoo"
  | "custom";

export type EmailAiProvider =
  | "default"
  | "anthropic"
  | "openai"
  | "google"
  | "custom";

export type EmailFolderKey =
  | "inbox"
  | "sent"
  | "drafts"
  | "trash"
  | "junk"
  | "archive"
  | "outbox"
  | "starred";

export type EmailAccountRow = {
  id: string;
  user_id: string;
  display_name: string;
  email_address: string;
  provider: EmailProvider;
  auth_type: "imap" | "oauth";
  imap_host: string | null;
  imap_port: number;
  imap_secure: boolean;
  smtp_host: string | null;
  smtp_port: number;
  smtp_secure: boolean;
  username: string | null;
  password: string | null;
  oauth_access_token: string | null;
  oauth_refresh_token: string | null;
  oauth_expires_at: string | null;
  ai_provider: EmailAiProvider | null;
  ai_model: string | null;
  ai_api_key: string | null;
  signature: string | null;
  accent_color: string | null;
  is_default: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailMessageRow = {
  id: string;
  account_id: string;
  uid: number;
  folder: string;
  message_id: string | null;
  subject: string | null;
  from_address: string | null;
  from_name: string | null;
  to_addresses: { name?: string; address: string }[];
  cc_addresses: { name?: string; address: string }[];
  bcc_addresses: { name?: string; address: string }[];
  body_text: string | null;
  body_html: string | null;
  snippet: string | null;
  email_date: string | null;
  is_read: boolean;
  is_starred: boolean;
  is_flagged: boolean;
  has_attachments: boolean;
  attachments: { filename: string; contentType?: string; size?: number; index?: number }[];
  in_reply_to: string | null;
  reply_references: string | null;
  synced_at: string;
};

export type EmailAccountSafe = Omit<EmailAccountRow, "password" | "oauth_access_token" | "oauth_refresh_token" | "ai_api_key">;

export type ComposeMode = "new" | "reply" | "replyAll" | "forward";
