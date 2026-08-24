-- App-native users (Railway) + repoint FKs from auth.users → public.app_users

create extension if not exists citext;
create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  password_hash text not null,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_users_email_idx on public.app_users (email);

-- Copy from Supabase auth.users when present
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'auth' and table_name = 'users'
  ) then
    insert into public.app_users (
      id,
      email,
      password_hash,
      email_confirmed_at,
      last_sign_in_at,
      banned_until,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    select
      u.id,
      u.email,
      coalesce(u.encrypted_password, ''),
      u.email_confirmed_at,
      u.last_sign_in_at,
      u.banned_until,
      coalesce(u.raw_user_meta_data, '{}'::jsonb),
      coalesce(u.created_at, now()),
      coalesce(u.updated_at, now())
    from auth.users u
    where u.email is not null
    on conflict (id) do nothing;

    drop trigger if exists on_auth_user_created on auth.users;
  end if;
exception
  when undefined_table then
    null;
  when invalid_schema_name then
    null;
end $$;

create or replace function public.handle_new_app_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(coalesce(new.email::text, 'user'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_app_user_created on public.app_users;
create trigger on_app_user_created
  after insert on public.app_users
  for each row execute function public.handle_new_app_user();

-- Repoint every FK that currently targets auth.users → public.app_users
do $$
declare
  r record;
  delete_action text;
  update_action text;
  new_name text;
begin
  for r in
    select
      tc.table_schema,
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      rc.delete_rule,
      rc.update_rule
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.referential_constraints rc
      on tc.constraint_name = rc.constraint_name
     and tc.constraint_schema = rc.constraint_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.constraint_schema = tc.constraint_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and ccu.table_schema = 'auth'
      and ccu.table_name = 'users'
  loop
    delete_action := case upper(r.delete_rule)
      when 'CASCADE' then 'cascade'
      when 'SET NULL' then 'set null'
      when 'SET DEFAULT' then 'set default'
      when 'RESTRICT' then 'restrict'
      else 'no action'
    end;
    update_action := case upper(r.update_rule)
      when 'CASCADE' then 'cascade'
      when 'SET NULL' then 'set null'
      when 'SET DEFAULT' then 'set default'
      when 'RESTRICT' then 'restrict'
      else 'no action'
    end;

    execute format(
      'alter table %I.%I drop constraint %I',
      r.table_schema,
      r.table_name,
      r.constraint_name
    );

    new_name := left(r.table_name || '_' || r.column_name || '_app_users_fkey', 63);

    execute format(
      'alter table %I.%I add constraint %I foreign key (%I) references public.app_users(id) on delete %s on update %s',
      r.table_schema,
      r.table_name,
      new_name,
      r.column_name,
      delete_action,
      update_action
    );
  end loop;
exception
  when undefined_table then
    null;
  when invalid_schema_name then
    null;
end $$;

-- Ensure profiles PK/FK points at app_users even if auth schema was already gone
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    begin
      alter table public.profiles drop constraint if exists profiles_id_fkey;
    exception when undefined_object then null;
    end;

    if not exists (
      select 1
      from information_schema.table_constraints
      where table_schema = 'public'
        and table_name = 'profiles'
        and constraint_name = 'profiles_id_app_users_fkey'
    ) then
      alter table public.profiles
        add constraint profiles_id_app_users_fkey
        foreign key (id) references public.app_users(id) on delete cascade;
    end if;
  end if;
end $$;
