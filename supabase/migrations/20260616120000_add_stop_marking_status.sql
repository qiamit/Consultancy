-- Add stop_marking to project_status enum so BIS licenses can be marked as stop marking.
do $$
begin
  alter type public.project_status add value 'stop_marking';
exception
  when duplicate_object then null;
end
$$;
