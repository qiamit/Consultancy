-- Email module: multi-provider accounts + cached messages (Outlook-style client)

create table if not exists public.email_accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  display_name      text not null,
  email_address     text not null,
  provider          text not null check (provider in ('gmail', 'outlook', 'hotmail', 'zoho', 'yahoo', 'custom')),
  auth_type         text not null default 'imap' check (auth_type in ('imap', 'oauth')),
  imap_host         text,
  imap_port         int not null default 993,
  imap_secure       boolean not null default true,
  smtp_host         text,
  smtp_port         int not null default 587,
  smtp_secure       boolean not null default false,
  username          text,
  password          text,
  oauth_access_token  text,
  oauth_refresh_token text,
  oauth_expires_at    timestamptz,
  ai_provider       text check (ai_provider in ('default', 'anthropic', 'openai', 'google', 'custom')),
  ai_model          text,
  ai_api_key        text,
  signature         text,
  accent_color      text default '#0ea5e9',
  is_default        boolean not null default false,
  last_sync_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, email_address)
);

create table if not exists public.email_messages (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references public.email_accounts(id) on delete cascade,
  uid             bigint not null,
  folder          text not null default 'INBOX',
  message_id      text,
  subject         text,
  from_address    text,
  from_name       text,
  to_addresses    jsonb not null default '[]',
  cc_addresses    jsonb not null default '[]',
  bcc_addresses   jsonb not null default '[]',
  body_text       text,
  body_html       text,
  snippet         text,
  email_date      timestamptz,
  is_read         boolean not null default false,
  is_starred      boolean not null default false,
  is_flagged      boolean not null default false,
  has_attachments boolean not null default false,
  attachments     jsonb not null default '[]',
  in_reply_to     text,
  reply_references text,
  synced_at       timestamptz not null default now(),
  unique (account_id, folder, uid)
);

create index if not exists email_messages_account_folder_date
  on public.email_messages (account_id, folder, email_date desc);

create index if not exists email_accounts_user_id
  on public.email_accounts (user_id);

alter table public.email_accounts enable row level security;
alter table public.email_messages enable row level security;

create policy "email_accounts_own"
  on public.email_accounts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "email_messages_own"
  on public.email_messages for all
  to authenticated
  using (
    exists (
      select 1 from public.email_accounts a
      where a.id = email_messages.account_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.email_accounts a
      where a.id = email_messages.account_id and a.user_id = auth.uid()
    )
  );
