-- PostgREST embedded selects need a FK from bis_projects.is_code_id -> is_codes.id.
-- If is_code_id was added with "IF NOT EXISTS" while the column already existed,
-- PostgreSQL skips the whole ADD (including REFERENCES), leaving no FK.

alter table public.bis_projects
  add column if not exists is_code_id uuid;

do $$
declare
  has_fk boolean;
begin
  select exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_schema = kcu.constraint_schema
     and tc.constraint_name = kcu.constraint_name
    join information_schema.constraint_column_usage ccu
      on tc.constraint_schema = ccu.constraint_schema
     and tc.constraint_name = ccu.constraint_name
    where tc.table_schema = 'public'
      and tc.table_name = 'bis_projects'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'is_code_id'
      and ccu.table_schema = 'public'
      and ccu.table_name = 'is_codes'
  )
  into has_fk;

  if not has_fk then
    alter table public.bis_projects
      add constraint bis_projects_is_code_id_fkey
      foreign key (is_code_id) references public.is_codes (id) on delete set null;
  end if;
end
$$;
